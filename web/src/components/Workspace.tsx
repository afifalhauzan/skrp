"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Assistant } from "./Assistant";
import { EvaluationPanel, type EvaluationFailure } from "./EvaluationPanel";
import { StudentGate } from "./AsyncState";
import { LinkButton, Shell } from "./Shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProgressBar } from "./ProgressBar";
import { FlowchartEditor } from "./FlowchartEditor";
import { PythonPanel } from "@/features/python-editor/PythonPanel";
import { TestPanel } from "@/features/python-editor/TestPanel";
import { useLearning } from "@/features/learning/LearningProvider";
import { ApiClientError } from "@/lib/api";
import {
  getCase,
  getCodeDraft,
  getFlowchartDraft,
  stages,
} from "@/lib/mock-data";
import { containerCls } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { ClientTestResult } from "@skrp/shared";
import type { Flowchart, ProblemSpec, StageId } from "@/lib/types";

export function Workspace(props: { caseId: string; stageId: string }) {
  return (
    <StudentGate>
      <WorkspaceInner {...props} />
    </StudentGate>
  );
}

function WorkspaceInner({
  caseId,
  stageId,
}: {
  caseId: string;
  stageId: string;
}) {
  const router = useRouter();
  const learning = useLearning();
  const item = getCase(caseId);
  const current = (
    stages.some((s) => s.id === stageId) ? stageId : "understand"
  ) as StageId;
  const completed = learning.progressFor(caseId)?.completedStages ?? [];
  const completedKey = completed.join(",");
  const spec = learning.specFor(caseId);
  const pseudocode = learning.pseudocodeFor(caseId);
  const draft = learning.codeFor(caseId);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  // The exact code that last passed every test; the stage unlocks only for that code.
  const [passedSource, setPassedSource] = useState<string | null>(null);
  // Browser-reported test outcomes for the exact code they ran against (unverified evidence).
  const [testRun, setTestRun] = useState<{
    source: string;
    results: ClientTestResult[];
  } | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<EvaluationFailure | null>(null);

  useEffect(() => {
    const done = completedKey ? completedKey.split(",") : [];
    const stageIndex = stages.findIndex((stage) => stage.id === current);
    const firstIncomplete = stages.findIndex(
      (stage) => !done.includes(stage.id),
    );
    if (stageIndex > firstIncomplete && firstIncomplete >= 0) {
      router.replace(`/learn/${caseId}/${stages[firstIncomplete].id}`);
    }
  }, [caseId, completedKey, current, router]);

  useEffect(() => {
    setEvalError(null);
  }, [caseId, stageId]);

  // An evaluation held in memory can predate a rule change on the server; re-read it when
  // the stage opens so "Boleh lanjut" always reflects the backend's current policy.
  const { aiEnabled, refreshEvaluation } = learning;
  useEffect(() => {
    if (aiEnabled) void refreshEvaluation(caseId, current).catch(() => {});
  }, [aiEnabled, refreshEvaluation, caseId, current]);

  const go = (id: StageId) => router.push(`/learn/${caseId}/${id}`);
  const nextStage = stages[stages.findIndex((s) => s.id === current) + 1];
  const title = stages.find((s) => s.id === current)?.label ?? "";

  const workReady =
    current === "understand"
      ? Object.values(spec).every(Boolean)
      : current === "design"
        ? Boolean(pseudocode.trim())
        : current === "implement"
          ? Boolean(draft.run)
          : completed.includes("test") || passedSource === draft.source;

  // With the AI backend on, the backend only lets a stage complete after the CURRENT work
  // was evaluated; the UI mirrors that. In mock mode (no backend) the old rule applies.
  const evaluation = learning.evaluationFor(caseId, current);
  const evaluationCurrent = learning.stageSatisfied(caseId, current);
  const canContinue =
    workReady &&
    (!learning.aiEnabled || completed.includes(current) || evaluationCurrent);
  const testsRunForThisCode =
    current !== "test" || testRun?.source === draft.source;

  const runEvaluation = async () => {
    setEvaluating(true);
    setEvalError(null);
    setMessage("");
    try {
      await learning.evaluateStage(
        caseId,
        current,
        current === "test" && testRun?.source === draft.source
          ? testRun.results
          : undefined,
      );
    } catch (error) {
      const api = error instanceof ApiClientError ? error : null;
      setEvalError({
        message:
          api?.message ??
          (error instanceof Error ? error.message : "Terjadi kesalahan."),
        retryable: api ? api.isRetryable || api.isAiFailure : false,
      });
    } finally {
      setEvaluating(false);
    }
  };

  const advance = async () => {
    setBusy(true);
    setMessage("");
    try {
      await learning.completeStage(caseId, current, nextStage?.id ?? null);
      if (nextStage) go(nextStage.id);
      else router.push(`/case-review/${caseId}`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gagal menyimpan. Coba lagi.",
      );
      // The server refused to complete the stage: our copy of the evaluation is out of date.
      if (error instanceof ApiClientError && error.code === "INVALID_STATE") {
        void learning.refreshEvaluation(caseId, current).catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  };
  const saveDraft = async () => {
    setMessage(
      (await learning.saveNow()) ? "Tersimpan." : "Gagal menyimpan. Coba lagi.",
    );
  };

  const saveStatus =
    learning.saveState === "saving"
      ? "Menyimpan…"
      : learning.saveState === "error"
        ? "Gagal menyimpan"
        : draft.revision
          ? `Tersimpan · revisi ${draft.revision}${learning.mode === "mock" ? " (mock lokal)" : ""}`
          : undefined;
  const failed = learning.saveState === "error" || message.startsWith("Gagal");

  return (
    <Shell>
      <main className={cn(containerCls, "space-y-4 pb-12 pt-6 sm:pt-8")}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge>Kasus {item.number} aktif</Badge>
            <h1 className="mt-2 font-heading text-2xl font-bold leading-tight sm:text-3xl">
              {item.title}
            </h1>
            {/* <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {item.context}
            </p> */}
          </div>
          <LinkButton href={`/case-review/${caseId}`} variant="outline">
            Lihat perkembangan
          </LinkButton>
        </div>
        <ProgressBar
          caseId={caseId}
          current={current}
          completed={completed}
          onNavigate={go}
        />
        <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
          <Card>
            <CardContent>
              <div className="mb-5 flex items-start justify-between gap-3 border-b pb-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Tahap {stages.findIndex((s) => s.id === current) + 1} dari{" "}
                    {stages.length}
                  </p>
                  <h2 className="mt-1 font-heading text-xl font-bold sm:text-2xl">
                    {title}
                  </h2>
                </div>
                <Badge
                  variant={
                    completed.includes(current) ? "default" : "secondary"
                  }
                >
                  {completed.includes(current) ? "Selesai" : "Aktif"}
                </Badge>
              </div>
              {current === "understand" && (
                <Understand
                  spec={spec}
                  onChange={(value) => learning.setSpec(caseId, value)}
                />
              )}
              {current === "design" && (
                <Design
                  caseId={caseId}
                  value={pseudocode}
                  flowchart={learning.flowchartFor(caseId)}
                  onChange={(value) => learning.setPseudocode(caseId, value)}
                  onFlowchartChange={(value) =>
                    learning.setFlowchart(caseId, value)
                  }
                />
              )}
              {current === "implement" && (
                <PythonPanel
                  source={draft.source}
                  draftSource={getCodeDraft(caseId)}
                  stdin={draft.stdin}
                  result={draft.run}
                  saveStatus={saveStatus}
                  onSourceChange={(source) =>
                    learning.setCode(caseId, { source })
                  }
                  onStdinChange={(stdin) => learning.setCode(caseId, { stdin })}
                  onResult={(run) => learning.recordRun(caseId, run)}
                />
              )}
              {current === "test" && (
                <TestPanel
                  tests={item.tests}
                  source={draft.source}
                  onComplete={(allPassed, source, results) => {
                    setPassedSource(allPassed ? source : null);
                    setTestRun({ source, results });
                  }}
                  onEditCode={() => go("implement")}
                />
              )}
              {learning.aiEnabled && (
                <EvaluationPanel
                  evaluation={evaluation}
                  current={learning.evaluationIsCurrent(caseId, current)}
                  evaluating={evaluating}
                  error={evalError}
                  onRetry={runEvaluation}
                />
              )}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <span
                  className={cn(
                    "text-sm",
                    failed ? "text-destructive" : "text-muted-foreground",
                  )}
                  role="status"
                >
                  {message ||
                    (learning.saveState === "error" ? learning.saveError : "")}
                  {learning.saveState === "error" && (
                    <button
                      className="ml-3 underline"
                      onClick={learning.retrySave}
                    >
                      Coba simpan lagi
                    </button>
                  )}
                </span>
                <div className="flex flex-wrap gap-2">
                  {learning.aiEnabled && (
                    <Button
                      variant="secondary"
                      onClick={runEvaluation}
                      disabled={
                        evaluating || busy || !workReady || !testsRunForThisCode
                      }
                      title={
                        !testsRunForThisCode
                          ? "Jalankan semua tes untuk kode ini dulu"
                          : undefined
                      }
                    >
                      {evaluating ? "Memeriksa…" : "Periksa jawaban"}
                    </Button>
                  )}
                  <Button variant="outline" onClick={saveDraft} disabled={busy}>
                    {completed.includes(current)
                      ? "Simpan perubahan"
                      : "Simpan draf"}
                  </Button>
                  <Button onClick={advance} disabled={!canContinue || busy}>
                    {nextStage
                      ? `Lanjut ke ${nextStage.short}`
                      : "Selesaikan kasus"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Assistant caseId={caseId} stageId={current} stage={title} />
            <Card>
              <CardContent>
                <Badge variant="secondary">Tujuan misi</Badge>
                <p className="mt-3 text-sm leading-6">{item.goal}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Aturan &amp; format
                </p>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-5">
                  {item.rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {learning.aiEnabled
                    ? "Tahap berikutnya terbuka setelah pekerjaanmu diperiksa (tombol “Periksa jawaban”)."
                    : "Tahap ditandai selesai setelah hasil kerjanya terisi"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </Shell>
  );
}

function Understand({
  spec,
  onChange,
}: {
  spec: ProblemSpec;
  onChange: (value: ProblemSpec) => void;
}) {
  const fields: [keyof ProblemSpec, string, string][] = [
    ["goal", "Tujuan", "Apa yang harus diselesaikan?"],
    ["input", "Input", "Data apa yang dibutuhkan?"],
    ["process", "Proses", "Langkah atau aturan apa yang digunakan?"],
    ["output", "Output", "Hasil apa yang diharapkan?"],
    ["constraints", "Batasan", "Kondisi apa yang perlu diperhatikan?"],
  ];
  return (
    <div className="space-y-4">
      {fields.map(([key, label, placeholder]) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`spec-${key}`}>{label}</Label>
          <Textarea
            id={`spec-${key}`}
            aria-label={label}
            value={spec[key]}
            onChange={(e) => onChange({ ...spec, [key]: e.target.value })}
            placeholder={placeholder}
            rows={2}
          />
        </div>
      ))}
    </div>
  );
}

function Design({
  caseId,
  value,
  flowchart,
  onChange,
  onFlowchartChange,
}: {
  caseId: string;
  value: string;
  flowchart?: Flowchart;
  onChange: (value: string) => void;
  onFlowchartChange: (value: Flowchart) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-muted p-3 text-sm leading-6 text-muted-foreground">
        Susun algoritma dalam langkah-langkah singkat, lalu gambarkan sebagai
        flowchart.
      </p>
      <FlowchartEditor
        key={caseId}
        value={flowchart}
        draft={getFlowchartDraft(caseId)}
        onChange={onFlowchartChange}
      />
      <div className="space-y-2">
        <Label htmlFor="pseudocode">Pseudocode</Label>
        <Textarea
          id="pseudocode"
          aria-label="Pseudocode"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            "MULAI\nBaca input...\nHitung...\nTampilkan hasil\nSELESAI"
          }
          rows={10}
          spellCheck={false}
          className="rounded-xl border-zinc-800 bg-zinc-950 p-4 font-mono text-sm leading-6 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-primary"
        />
      </div>
    </div>
  );
}
