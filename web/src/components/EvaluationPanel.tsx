"use client";
import { CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import type { StageEvaluation } from "@skrp/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export interface EvaluationFailure {
  message: string;
  /** True for a model/provider problem: the student's work was kept and retry makes sense. */
  retryable: boolean;
}

interface Props {
  evaluation: StageEvaluation | undefined;
  /** False when the student edited the work after this evaluation. */
  current: boolean;
  evaluating: boolean;
  error: EvaluationFailure | null;
  onRetry: () => void;
}

/** Shows the validated score breakdown and feedback, or an honest loading/failure state. */
export function EvaluationPanel({
  evaluation,
  current,
  evaluating,
  error,
  onRetry,
}: Props) {
  if (evaluating) {
    return (
      <Alert className="mt-5" data-testid="evaluation-loading">
        <Loader2 className="animate-spin" />
        <AlertTitle>Memeriksa jawabanmu…</AlertTitle>
        <AlertDescription>
          Ini bisa memakan waktu beberapa detik. Pekerjaanmu tetap aman.
        </AlertDescription>
      </Alert>
    );
  }
  if (error) {
    return (
      <Alert
        variant="destructive"
        className="mt-5"
        data-testid="evaluation-error"
      >
        <XCircle />
        <AlertTitle>Pemeriksaan belum berhasil</AlertTitle>
        <AlertDescription>
          <p>{error.message}</p>
          <p className="mt-1">
            Pekerjaanmu tetap tersimpan dan kamu tetap di tahap ini. Tahap
            berikutnya belum terbuka.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onRetry}
          >
            Coba lagi
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (!evaluation) return null;

  if (evaluation.status !== "COMPLETED") {
    return (
      <Alert variant="destructive" className="mt-5">
        <XCircle />
        <AlertTitle>Pemeriksaan sebelumnya belum berhasil</AlertTitle>
        <AlertDescription>
          <p>{evaluation.failure?.message ?? "Evaluasi belum selesai."}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onRetry}
          >
            Periksa ulang
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const satisfied = evaluation.completion.satisfied && current;
  return (
    <Card className="mt-5" data-testid="evaluation-result">
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hasil pemeriksaan
            </p>
            <p className="font-heading text-2xl font-bold">
              {evaluation.totalScore}/{evaluation.maxScore}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                skor sementara
              </span>
            </p>
          </div>
          <Badge variant={satisfied ? "default" : "secondary"}>
            {satisfied
              ? "Boleh lanjut"
              : current
                ? "Belum memenuhi syarat lanjut"
                : "Pekerjaan berubah"}
          </Badge>
        </div>

        {!current && (
          <Alert>
            <Info />
            <AlertDescription>
              Hasil ini untuk versi pekerjaan sebelumnya (disimpan sebagai
              riwayat). Tekan “Periksa jawaban” lagi untuk menilai versi
              terbaru.
            </AlertDescription>
          </Alert>
        )}

        <ul className="space-y-3">
          {evaluation.criteria.map((c) => (
            <li key={c.key}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{c.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {c.score}/{c.maxScore}
                </span>
              </div>
              <Progress value={(c.score / c.maxScore) * 100} className="mt-1" />
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {c.evidence}
              </p>
            </li>
          ))}
        </ul>

        <div className="grid gap-4 sm:grid-cols-2">
          {evaluation.wentWell.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <CheckCircle2 className="size-4 text-primary" /> Yang sudah baik
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {evaluation.wentWell.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {evaluation.needsImprovement.length > 0 && (
            <div>
              <p className="text-sm font-semibold">Yang perlu diperbaiki</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {evaluation.needsImprovement.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {evaluation.feedback && (
          <p className="rounded-lg bg-muted p-3 text-sm leading-6">
            {evaluation.feedback}
          </p>
        )}

        {evaluation.uncertainty?.insufficientEvidence && (
          <Alert>
            <Info />
            <AlertDescription>
              Bukti pada pekerjaanmu belum cukup untuk dinilai dengan yakin
              {evaluation.uncertainty.notes
                ? `: ${evaluation.uncertainty.notes}`
                : "."}
            </AlertDescription>
          </Alert>
        )}

        {!evaluation.completion.satisfied && current && (
          <p className="text-xs text-muted-foreground">
            {evaluation.completion.reason}
          </p>
        )}
        <p className="text-[11px] leading-4 text-muted-foreground">
          Penilaian AI ini bersifat sementara untuk membantu belajar, bukan
          nilai akhir. Kelayakan lanjut ditentukan aturan aplikasi (
          {evaluation.completion.policyVersion}), bukan oleh AI.
        </p>
      </CardContent>
    </Card>
  );
}
