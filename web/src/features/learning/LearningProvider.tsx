"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AssistanceHistory,
  AssistanceInteraction,
  CaseEvaluation,
  CaseProgress,
  ClientTestResult,
  ExecutionMetadata,
  Flowchart,
  ProblemSpec,
  ProgressSnapshot,
  RoutingDecision,
  StageEvaluation,
  StageId,
  StudentProfile,
} from "@skrp/shared";
import {
  ApiClientError,
  getApiClient,
  resetMockData,
  type ApiClient,
} from "@/lib/api";
import { blankSpec, getCodeDraft, getStdinDraft } from "@/lib/mock-data";
import { splitStdin } from "../python-editor/engine";
import {
  isResultCurrent,
  toMetadata,
  type ExecutionResult,
} from "../python-editor/types";

const SESSION_KEY = "pyscaffold-student-code";
const AUTOSAVE_MS = 1200;
const JOURNEY = "journey";

export type LoadState =
  | { status: "loading" | "anonymous" | "ready" }
  | { status: "error"; error: ApiClientError };
export type SaveState = "idle" | "saving" | "saved" | "error";

export interface CodeDraft {
  source: string;
  stdin: string;
  /** Last revision number confirmed by the backend (null until the first save). */
  revision: number | null;
  /** Most recent run of this case's code, from this session or restored from the backend. */
  run?: ExecutionResult;
}

interface Store {
  cases: Record<string, CaseProgress>;
  specs: Record<string, ProblemSpec>;
  pseudocode: Record<string, string>;
  flowcharts: Record<string, Flowchart>;
  code: Record<string, CodeDraft>;
  reflection: string;
  /** Latest stage evaluation per `${caseId}:${stage}`. */
  evaluations: Record<string, StageEvaluation>;
  /** Latest routing decision per case. */
  routing: Record<string, RoutingDecision>;
  /** Work edited since its last evaluation, per `${caseId}:${stage}`. */
  dirty: Record<string, boolean>;
}

const evalKey = (caseId: string, stage: StageId) => `${caseId}:${stage}`;

const emptyStore = (): Store => ({
  cases: {},
  specs: {},
  pseudocode: {},
  flowcharts: {},
  code: {},
  reflection: "",
  evaluations: {},
  routing: {},
  dirty: {},
});

function restoreRun(
  source: string,
  stdin: string,
  revision: number,
  meta: ExecutionMetadata,
): ExecutionResult {
  return {
    ...meta,
    runId: `saved-${revision}`,
    source,
    stdin,
    stdinLines: splitStdin(stdin).length,
  };
}

/** FLOWCHART artifacts are JSON strings; ignore anything that is not a graph. */
function parseFlowchart(content: string): Flowchart | null {
  try {
    const parsed = JSON.parse(content) as Partial<Flowchart> | null;
    return parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)
      ? (parsed as Flowchart)
      : null;
  } catch {
    return null;
  }
}

function fromSnapshot(snapshot: ProgressSnapshot): Store {
  const store = emptyStore();
  for (const c of snapshot.cases) store.cases[c.caseId] = c;
  for (const a of snapshot.artifacts) {
    if (a.kind === "PROBLEM_SPEC" && typeof a.content === "object")
      store.specs[a.caseId] = a.content;
    else if (a.kind === "PSEUDOCODE" && typeof a.content === "string")
      store.pseudocode[a.caseId] = a.content;
    else if (a.kind === "FLOWCHART" && typeof a.content === "string") {
      const flowchart = parseFlowchart(a.content);
      if (flowchart) store.flowcharts[a.caseId] = flowchart;
    } else if (a.kind === "REFLECTION" && typeof a.content === "string")
      store.reflection = a.content;
  }
  for (const e of snapshot.stageEvaluations ?? [])
    store.evaluations[evalKey(e.caseId, e.stage)] = e;
  for (const d of snapshot.routing ?? []) store.routing[d.currentCaseId] = d;
  for (const r of snapshot.latestCode) {
    store.code[r.caseId] = {
      source: r.source,
      stdin: r.stdin,
      revision: r.revision,
      run: r.execution
        ? restoreRun(r.source, r.stdin, r.revision, r.execution)
        : undefined,
    };
  }
  return store;
}

interface LearningContextValue {
  mode: ApiClient["mode"];
  load: LoadState;
  student: StudentProfile | null;
  saveState: SaveState;
  saveError: string | null;

  login(studentCode: string): Promise<StudentProfile>;
  logout(): void;
  reload(): void;
  resetMock(): void;

  progressFor(caseId: string): CaseProgress | undefined;
  specFor(caseId: string): ProblemSpec;
  pseudocodeFor(caseId: string): string;
  /** The student's flowchart, or undefined until they (or a BE/AI draft) saved one. */
  flowchartFor(caseId: string): Flowchart | undefined;
  codeFor(caseId: string): CodeDraft;
  reflection: string;

  setSpec(caseId: string, spec: ProblemSpec): void;
  setPseudocode(caseId: string, value: string): void;
  setFlowchart(caseId: string, value: Flowchart): void;
  setCode(
    caseId: string,
    patch: Partial<Pick<CodeDraft, "source" | "stdin">>,
  ): void;
  recordRun(caseId: string, run: ExecutionResult): void;
  setReflection(value: string): void;
  saveReflection(): Promise<void>;
  /** Flushes pending autosaves, then persists stage completion. Throws if anything fails to save. */
  completeStage(
    caseId: string,
    stage: StageId,
    next: StageId | null,
  ): Promise<void>;
  /** Flushes pending autosaves now; resolves true when everything is saved. */
  saveNow(): Promise<boolean>;
  retrySave(): void;

  // ---- AI evaluation, assistance and routing (live mode only) ----------------
  /** False in mock mode: AI features are unavailable rather than faked. */
  aiEnabled: boolean;
  evaluationFor(caseId: string, stage: StageId): StageEvaluation | undefined;
  /** True when the latest evaluation describes the CURRENT work (not edited since). */
  evaluationIsCurrent(caseId: string, stage: StageId): boolean;
  /** True when that evaluation also satisfies the (provisional) completion policy. */
  stageSatisfied(caseId: string, stage: StageId): boolean;
  /** Flushes autosaves, then asks the backend to evaluate the saved work. Throws ApiClientError. */
  evaluateStage(
    caseId: string,
    stage: StageId,
    testResults?: ClientTestResult[],
  ): Promise<StageEvaluation>;
  requestHint(
    caseId: string,
    stage: StageId,
    requestId: string,
  ): Promise<AssistanceInteraction>;
  hintHistory(caseId: string, stage: StageId): Promise<AssistanceHistory>;
  routingFor(caseId: string): RoutingDecision | undefined;
  evaluateCase(
    caseId: string,
  ): Promise<{ caseEvaluation: CaseEvaluation; routing: RoutingDecision }>;
}

const Ctx = createContext<LearningContextValue | null>(null);

export function LearningProvider({ children }: { children: ReactNode }) {
  const api = useMemo(getApiClient, []);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [store, setStoreState] = useState<Store>(emptyStore);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const storeRef = useRef(store);
  const codeRef = useRef<string | null>(null);
  const loadSeq = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, () => Promise<unknown>>());
  const failed = useRef(new Map<string, () => Promise<unknown>>());
  const inflight = useRef(0);

  const setStore = useCallback((update: (s: Store) => Store) => {
    const next = update(storeRef.current);
    storeRef.current = next;
    setStoreState(next);
  }, []);

  // ---- autosave plumbing ---------------------------------------------------
  const runTask = useCallback(
    async (key: string, task: () => Promise<unknown>) => {
      inflight.current++;
      setSaveState("saving");
      try {
        await task();
        failed.current.delete(key);
      } catch (error) {
        failed.current.set(key, task);
        setSaveError(
          error instanceof Error ? error.message : "Gagal menyimpan.",
        );
      } finally {
        inflight.current--;
        if (inflight.current === 0)
          setSaveState(failed.current.size > 0 ? "error" : "saved");
      }
    },
    [],
  );

  const schedule = useCallback(
    (key: string, task: () => Promise<unknown>) => {
      if (!codeRef.current) return;
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);
      pending.current.set(key, task);
      setSaveState("saving");
      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key);
          pending.current.delete(key);
          void runTask(key, task);
        }, AUTOSAVE_MS),
      );
    },
    [runTask],
  );

  const flush = useCallback(async () => {
    const entries = [...pending.current.entries()];
    for (const [key] of entries) {
      const timer = timers.current.get(key);
      if (timer) clearTimeout(timer);
      timers.current.delete(key);
      pending.current.delete(key);
    }
    await Promise.all(entries.map(([key, task]) => runTask(key, task)));
    return failed.current.size === 0;
  }, [runTask]);

  const cancelAllSaves = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    pending.current.clear();
    failed.current.clear();
    setSaveState("idle");
    setSaveError(null);
  }, []);

  // ---- loading / identity --------------------------------------------------
  const loadProgress = useCallback(
    async (code: string) => {
      const seq = ++loadSeq.current;
      setLoad({ status: "loading" });
      try {
        const snapshot = await api.getProgress(code);
        if (seq !== loadSeq.current) return;
        codeRef.current = code;
        setStudent(snapshot.student);
        setStore(() => fromSnapshot(snapshot));
        setLoad({ status: "ready" });
      } catch (error) {
        if (seq !== loadSeq.current) return;
        const err =
          error instanceof ApiClientError
            ? error
            : new ApiClientError(
                0,
                "UNKNOWN",
                "Terjadi kesalahan tak terduga.",
              );
        if (err.isNotFound) {
          // The remembered student no longer exists or is inactive: back to the login screen.
          localStorage.removeItem(SESSION_KEY);
          codeRef.current = null;
          setStudent(null);
          setLoad({ status: "anonymous" });
        } else {
          setLoad({ status: "error", error: err });
        }
      }
    },
    [api, setStore],
  );

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(SESSION_KEY);
    } catch {
      /* storage unavailable: treat as signed out */
    }
    if (saved) {
      codeRef.current = saved;
      void loadProgress(saved);
    } else {
      setLoad({ status: "anonymous" });
    }
  }, [loadProgress]);

  const login = useCallback(
    async (input: string) => {
      const code = input.trim().toUpperCase();
      const profile = await api.getStudent(code);
      cancelAllSaves();
      try {
        localStorage.setItem(SESSION_KEY, profile.studentCode);
      } catch {
        /* works for this tab even if storage is blocked */
      }
      setStore(emptyStore);
      await loadProgress(profile.studentCode);
      return profile;
    },
    [api, cancelAllSaves, loadProgress, setStore],
  );

  const logout = useCallback(() => {
    void flush();
    loadSeq.current++;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    codeRef.current = null;
    setStudent(null);
    setStore(emptyStore);
    setLoad({ status: "anonymous" });
  }, [flush, setStore]);

  const reload = useCallback(() => {
    if (codeRef.current) void loadProgress(codeRef.current);
  }, [loadProgress]);

  const resetMock = useCallback(() => {
    cancelAllSaves();
    resetMockData();
    logout();
  }, [cancelAllSaves, logout]);

  // ---- mutations -----------------------------------------------------------
  const saveCode = useCallback(
    (caseId: string) => {
      schedule(`code:${caseId}`, async () => {
        const code = codeRef.current;
        const draft = storeRef.current.code[caseId];
        if (!code || !draft) return;
        const execution =
          draft.run && isResultCurrent(draft.run, draft.source, draft.stdin)
            ? toMetadata(draft.run)
            : null;
        const { revision } = await api.saveCodeRevision(code, caseId, {
          source: draft.source,
          stdin: draft.stdin,
          execution,
        });
        setStore((s) => {
          const latest = s.code[caseId];
          return latest
            ? {
                ...s,
                code: {
                  ...s.code,
                  [caseId]: { ...latest, revision: revision.revision },
                },
              }
            : s;
        });
      });
    },
    [api, schedule, setStore],
  );

  // Stable identities: consumers use these in effect dependencies.
  const evaluateStage = useCallback(
    async (
      caseId: string,
      stage: StageId,
      testResults?: ClientTestResult[],
    ): Promise<StageEvaluation> => {
      const code = codeRef.current;
      if (!code) throw new Error("Belum masuk sebagai siswa.");
      if (!(await flush()))
        throw new Error(
          "Perubahan terakhir belum tersimpan. Coba simpan ulang.",
        );
      const revision = storeRef.current.code[caseId]?.revision;
      const { evaluation } = await api.evaluateStage(code, {
        caseId,
        stage,
        ...((stage === "implement" || stage === "test") && revision
          ? { codeRevision: revision }
          : {}),
        ...(testResults?.length ? { testResults } : {}),
      });
      setStore((s) => ({
        ...s,
        evaluations: { ...s.evaluations, [evalKey(caseId, stage)]: evaluation },
        dirty: { ...s.dirty, [evalKey(caseId, stage)]: false },
      }));
      return evaluation;
    },
    [api, flush, setStore],
  );

  const requestHint = useCallback(
    async (caseId: string, stage: StageId, requestId: string) => {
      const code = codeRef.current;
      if (!code) throw new Error("Belum masuk sebagai siswa.");
      // Hints are based on what is saved, so push pending edits first (best effort).
      await flush();
      const { interaction } = await api.requestHint(code, {
        caseId,
        stage,
        requestId,
      });
      return interaction;
    },
    [api, flush],
  );

  const hintHistory = useCallback(
    async (caseId: string, stage: StageId) => {
      const code = codeRef.current;
      if (!code) throw new Error("Belum masuk sebagai siswa.");
      return api.getAssistanceHistory(code, caseId, stage);
    },
    [api],
  );

  const evaluateCase = useCallback(
    async (caseId: string) => {
      const code = codeRef.current;
      if (!code) throw new Error("Belum masuk sebagai siswa.");
      const result = await api.evaluateCase(code, caseId);
      setStore((s) => ({
        ...s,
        routing: { ...s.routing, [caseId]: result.routing },
      }));
      return result;
    },
    [api, setStore],
  );

  const markDirty = (s: Store, caseId: string, stages: StageId[]): Store => ({
    ...s,
    dirty: {
      ...s.dirty,
      ...Object.fromEntries(stages.map((st) => [evalKey(caseId, st), true])),
    },
  });

  const draftOf = (s: Store, caseId: string): CodeDraft =>
    s.code[caseId] ?? {
      source: getCodeDraft(caseId),
      stdin: getStdinDraft(caseId),
      revision: null,
    };

  const value: LearningContextValue = {
    mode: api.mode,
    load,
    student,
    saveState,
    saveError,
    login,
    logout,
    reload,
    resetMock,
    progressFor: (caseId) => store.cases[caseId],
    specFor: (caseId) => store.specs[caseId] ?? blankSpec,
    pseudocodeFor: (caseId) => store.pseudocode[caseId] ?? "",
    flowchartFor: (caseId) => store.flowcharts[caseId],
    codeFor: (caseId) => draftOf(store, caseId),
    reflection: store.reflection,

    setSpec(caseId, spec) {
      setStore((s) =>
        markDirty({ ...s, specs: { ...s.specs, [caseId]: spec } }, caseId, [
          "understand",
        ]),
      );
      schedule(`spec:${caseId}`, () =>
        api.saveArtifact(codeRef.current!, caseId, "PROBLEM_SPEC", {
          content: storeRef.current.specs[caseId] ?? spec,
        }),
      );
    },
    setPseudocode(caseId, text) {
      setStore((s) =>
        markDirty(
          { ...s, pseudocode: { ...s.pseudocode, [caseId]: text } },
          caseId,
          ["design"],
        ),
      );
      schedule(`pseudo:${caseId}`, () =>
        api.saveArtifact(codeRef.current!, caseId, "PSEUDOCODE", {
          content: storeRef.current.pseudocode[caseId] ?? text,
        }),
      );
    },
    setFlowchart(caseId, flowchart) {
      setStore((s) =>
        markDirty(
          { ...s, flowcharts: { ...s.flowcharts, [caseId]: flowchart } },
          caseId,
          ["design"],
        ),
      );
      schedule(`flow:${caseId}`, () =>
        api.saveArtifact(codeRef.current!, caseId, "FLOWCHART", {
          content: JSON.stringify(
            storeRef.current.flowcharts[caseId] ?? flowchart,
          ),
        }),
      );
    },
    setCode(caseId, patch) {
      setStore((s) => {
        const next = {
          ...s,
          code: { ...s.code, [caseId]: { ...draftOf(s, caseId), ...patch } },
        };
        // Only the source counts as "changed work"; tweaking stdin does not invalidate it.
        return patch.source !== undefined &&
          patch.source !== draftOf(s, caseId).source
          ? markDirty(next, caseId, ["implement", "test"])
          : next;
      });
      saveCode(caseId);
    },
    recordRun(caseId, run) {
      setStore((s) => ({
        ...s,
        code: { ...s.code, [caseId]: { ...draftOf(s, caseId), run } },
      }));
      saveCode(caseId);
    },
    setReflection(text) {
      setStore((s) => ({ ...s, reflection: text }));
    },
    async saveReflection() {
      const code = codeRef.current;
      if (!code) return;
      await api.saveArtifact(code, JOURNEY, "REFLECTION", {
        content: storeRef.current.reflection,
      });
    },
    async completeStage(caseId, stage, next) {
      const code = codeRef.current;
      if (!code) throw new Error("Belum masuk sebagai siswa.");
      if (!(await flush()))
        throw new Error(
          "Perubahan terakhir belum tersimpan. Coba simpan ulang.",
        );
      const done = new Set(
        storeRef.current.cases[caseId]?.completedStages ?? [],
      );
      done.add(stage);
      const saved = await api.saveCaseProgress(code, caseId, {
        currentStage: next ?? stage,
        completedStages: [...done],
      });
      setStore((s) => ({ ...s, cases: { ...s.cases, [caseId]: saved } }));
    },
    saveNow: flush,

    aiEnabled: api.aiEnabled,
    evaluationFor: (caseId, stage) => store.evaluations[evalKey(caseId, stage)],
    evaluationIsCurrent(caseId, stage) {
      const key = evalKey(caseId, stage);
      const e = store.evaluations[key];
      return !!e && e.isCurrent && !store.dirty[key];
    },
    stageSatisfied(caseId, stage) {
      const key = evalKey(caseId, stage);
      const e = store.evaluations[key];
      return !!e && e.isCurrent && !store.dirty[key] && e.completion.satisfied;
    },
    evaluateStage,
    requestHint,
    hintHistory,
    routingFor: (caseId) => store.routing[caseId],
    evaluateCase,
    retrySave() {
      const tasks = [...failed.current.entries()];
      failed.current.clear();
      setSaveError(null);
      tasks.forEach(([key, task]) => void runTask(key, task));
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLearning(): LearningContextValue {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useLearning must be used inside <LearningProvider>");
  return ctx;
}
