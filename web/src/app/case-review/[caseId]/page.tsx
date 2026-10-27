"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { CaseEvaluation, RoutingDecision } from "@skrp/shared";
import { ErrorCard, LoadingCard, StudentGate } from "@/components/AsyncState";
import { LinkButton, Shell } from "@/components/Shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLearning } from "@/features/learning/LearningProvider";
import { cases, getCase, stages } from "@/lib/mock-data";
import { COMPLETION_NOTE, BADGE_EXPLORATION } from "@/lib/strategy-copy";
import { containerCls } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default function CaseReview({ params }: { params: { caseId: string } }) {
  return (
    <StudentGate>
      <CaseReviewContent caseId={params.caseId} />
    </StudentGate>
  );
}

function CaseReviewContent({ caseId }: { caseId: string }) {
  const learning = useLearning();
  const { progressFor, aiEnabled, evaluateCase } = learning;
  const done: string[] = progressFor(caseId)?.completedStages ?? [];
  const item = getCase(caseId);
  const complete = done.length === stages.length;
  const percent = Math.round((done.length / stages.length) * 100);
  const mockNext =
    cases[cases.findIndex((c) => c.id === caseId) + 1]?.id ?? null;

  // Live mode: the next step comes from the backend routing policy, never from the client.
  const [caseEval, setCaseEval] = useState<CaseEvaluation | null>(null);
  const [routing, setRouting] = useState<RoutingDecision | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const load = useCallback(async () => {
    setState("loading");
    try {
      const result = await evaluateCase(caseId);
      setCaseEval(result.caseEvaluation);
      setRouting(result.routing);
      setState("idle");
    } catch {
      setState("error");
    }
  }, [evaluateCase, caseId]);
  useEffect(() => {
    if (complete && aiEnabled) void load();
  }, [complete, aiEnabled, load]);

  const next = aiEnabled ? (routing?.nextCaseId ?? null) : mockNext;
  const settled = !aiEnabled || (state === "idle" && routing !== null);
  return (
    <Shell>
      <main className={cn(containerCls, "space-y-4 pb-12 pt-6 sm:pt-10")}>
        <p className="text-sm font-medium text-primary">Evaluasi kasus</p>
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">
          {complete ? "Misi selesai!" : "Sedikit lagi"}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          {complete
            ? "Semua hasil kerja untuk kasus ini sudah tersimpan."
            : "Selesaikan setiap tahap untuk melihat evaluasi kasus."}
        </p>
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>
                  Kasus {item.number} · {item.title}
                </CardTitle>
                <CardDescription className="mt-1">
                  {done.length} dari {stages.length} tahap selesai
                </CardDescription>
              </div>
              <div className="font-heading text-3xl font-bold text-primary">
                {percent}%
              </div>
            </div>
            <Progress value={percent} />
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
              {stages.map((stage) => (
                <div
                  key={stage.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg p-3 text-sm font-medium",
                    done.includes(stage.id)
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {done.includes(stage.id) && <Check className="size-4" />}
                  {stage.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {complete && aiEnabled && state === "loading" && (
          <LoadingCard label="Menyusun evaluasi kasus…" />
        )}
        {complete && aiEnabled && state === "error" && (
          <ErrorCard
            message="Evaluasi kasus belum bisa dimuat. Hasil kerjamu tetap tersimpan."
            onRetry={load}
          />
        )}
        {complete && settled && (
          <Card className="border-dashed">
            <CardContent className="space-y-2">
              <Badge variant="secondary">{BADGE_EXPLORATION}</Badge>
              <p className="text-sm leading-6 text-muted-foreground">
                {COMPLETION_NOTE}
              </p>
              <LinkButton
                href={`/mission/${item.id}#eksplorasi`}
                variant="outline"
                size="sm"
              >
                Lihat ide strategi algoritmik
              </LinkButton>
            </CardContent>
          </Card>
        )}
        {complete && settled && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Langkah berikutnya
              </p>
              <h2 className="font-heading text-xl font-semibold">
                {routing?.status === "HOLD_INSUFFICIENT_EVIDENCE"
                  ? "Belum ada kasus berikutnya"
                  : next
                    ? `Lanjut ke Kasus ${cases.find((c) => c.id === next)?.number}`
                    : "Kamu mencapai akhir pembelajaran"}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {routing
                  ? routing.reason
                  : next
                    ? "Kamu siap melanjutkan ke misi berikutnya."
                    : "Semua kasus utama telah diselesaikan."}
              </p>
              {routing && routing.skippedCaseIds.length > 0 && (
                <p className="text-sm font-medium">
                  Dilewati (bukan diselesaikan):{" "}
                  {routing.skippedCaseIds
                    .map(
                      (id) => `Kasus ${cases.find((c) => c.id === id)?.number}`,
                    )
                    .join(", ")}
                </p>
              )}
              {caseEval && (
                <div className="space-y-2 rounded-lg bg-background p-3 text-sm">
                  <p>
                    Ringkasan skor sementara:{" "}
                    <strong>
                      {caseEval.summary.totalScore}/{caseEval.summary.maxScore}
                    </strong>{" "}
                    <span className="text-muted-foreground">
                      (gambaran, bukan penilaian akhir)
                    </span>
                  </p>
                  {caseEval.summary.strengths.length > 0 && (
                    <p>
                      <span className="font-medium">Kekuatan:</span>{" "}
                      {caseEval.summary.strengths.slice(0, 3).join("; ")}
                    </p>
                  )}
                  {caseEval.summary.improvements.length > 0 && (
                    <p>
                      <span className="font-medium">Bisa ditingkatkan:</span>{" "}
                      {caseEval.summary.improvements.slice(0, 3).join("; ")}
                    </p>
                  )}
                </div>
              )}
              {routing && (
                <p className="text-[11px] leading-4 text-muted-foreground">
                  Keputusan sementara ({routing.policyVersion}); aturan dan
                  ambangnya belum divalidasi dan dapat berubah.
                </p>
              )}
              {routing?.status === "HOLD_INSUFFICIENT_EVIDENCE" ? (
                <LinkButton href={`/learn/${caseId}/understand`}>
                  Kembali ke Kasus {item.number} <ArrowRight />
                </LinkButton>
              ) : (
                <LinkButton href={next ? `/mission/${next}` : "/final-review"}>
                  {next ? "Lanjutkan misi" : "Lihat evaluasi akhir"}{" "}
                  <ArrowRight />
                </LinkButton>
              )}
            </CardContent>
          </Card>
        )}
        {!complete && (
          <LinkButton href={`/learn/${caseId}/understand`}>
            Kembali ke Kasus {item.number} <ArrowRight />
          </LinkButton>
        )}
      </main>
    </Shell>
  );
}
