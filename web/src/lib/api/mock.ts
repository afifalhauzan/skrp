import type {
  Artifact,
  ArtifactKind,
  CaseProgress,
  CodeRevision,
  ProgressSnapshot,
  SaveArtifactInput,
  SaveCaseProgressInput,
  SaveCodeRevisionInput,
  SaveCodeRevisionResult,
  StageId,
} from "@skrp/shared";
import { MOCK_STUDENTS } from "./fixtures";
import { ApiClientError, type ApiClient } from "./types";

/**
 * Browser-only implementation of the API contract. Data lives in localStorage of
 * THIS browser and is never sent to any server; the UI shows a MOCK badge for it.
 */
const KEY = "pyscaffold-mock-db-v2";
const STAGES: StageId[] = ["understand", "design", "implement", "test"];

interface MockDb {
  [studentCode: string]: {
    cases: Record<string, CaseProgress>;
    artifacts: Record<string, Artifact>; // key: `${caseId}:${kind}`
    code: Record<string, CodeRevision[]>; // key: caseId
  };
}

function read(): MockDb {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as MockDb;
  } catch {
    return {};
  }
}
function write(db: MockDb) {
  localStorage.setItem(KEY, JSON.stringify(db));
}
function bucket(db: MockDb, code: string) {
  return (db[code] ??= { cases: {}, artifacts: {}, code: {} });
}
function requireStudent(code: string) {
  const student = MOCK_STUDENTS.find(
    (s) => s.studentCode === code.toUpperCase(),
  );
  if (!student)
    throw new ApiClientError(404, "NOT_FOUND", "Siswa tidak ditemukan.");
  return student;
}

export function resetMockData() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

export const mockClient: ApiClient = {
  mode: "mock",

  async getStudent(code) {
    return requireStudent(code);
  },

  async getProgress(code): Promise<ProgressSnapshot> {
    const student = requireStudent(code);
    const b = bucket(read(), student.studentCode);
    return {
      student,
      cases: Object.values(b.cases),
      artifacts: Object.values(b.artifacts),
      latestCode: Object.values(b.code).flatMap((list) => list.slice(-1)),
    };
  },

  async saveCaseProgress(code, caseId, input: SaveCaseProgressInput) {
    const student = requireStudent(code);
    const db = read();
    const b = bucket(db, student.studentCode);
    const now = new Date().toISOString();
    const existing = b.cases[caseId];
    const completedStages = STAGES.filter((s) =>
      input.completedStages.includes(s),
    );
    const done = completedStages.length === STAGES.length;
    const saved: CaseProgress = {
      caseId,
      status: done ? "COMPLETED" : "IN_PROGRESS",
      currentStage: input.currentStage,
      completedStages,
      startedAt: existing?.startedAt ?? now,
      completedAt: done ? (existing?.completedAt ?? now) : null,
      updatedAt: now,
    };
    b.cases[caseId] = saved;
    write(db);
    return saved;
  },

  async saveArtifact(
    code,
    caseId,
    kind: ArtifactKind,
    input: SaveArtifactInput,
  ) {
    const student = requireStudent(code);
    const db = read();
    const saved: Artifact = {
      caseId,
      kind,
      content: input.content,
      updatedAt: new Date().toISOString(),
    };
    bucket(db, student.studentCode).artifacts[`${caseId}:${kind}`] = saved;
    write(db);
    return saved;
  },

  async saveCodeRevision(
    code,
    caseId,
    input: SaveCodeRevisionInput,
  ): Promise<SaveCodeRevisionResult> {
    const student = requireStudent(code);
    const db = read();
    const list = (bucket(db, student.studentCode).code[caseId] ??= []);
    const latest = list[list.length - 1];
    if (
      latest &&
      latest.source === input.source &&
      latest.stdin === input.stdin
    ) {
      if (input.execution) latest.execution = input.execution;
      write(db);
      return { revision: latest, created: false };
    }
    const revision: CodeRevision = {
      caseId,
      revision: (latest?.revision ?? 0) + 1,
      source: input.source,
      stdin: input.stdin,
      execution: input.execution ?? null,
      createdAt: new Date().toISOString(),
    };
    list.push(revision);
    write(db);
    return { revision, created: true };
  },
};
