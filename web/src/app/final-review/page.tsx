"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { StudentGate } from "@/components/AsyncState";
import { LinkButton, Shell } from "@/components/Shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mascot } from "@/components/Mascot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useJourney,
  type JourneyCaseStatus,
} from "@/features/learning/journey";
import { useLearning } from "@/features/learning/LearningProvider";
import { stages } from "@/lib/mock-data";
import { CASE_CARD_NOTE } from "@/lib/strategy-copy";
import { containerCls } from "@/lib/ui";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<JourneyCaseStatus, string> = {
  COMPLETED: "Selesai",
  IN_PROGRESS: "Sedang berjalan",
  NOT_STARTED: "Belum dimulai",
};
const STATUS_VARIANT: Record<
  JourneyCaseStatus,
  "default" | "secondary" | "outline"
> = {
  COMPLETED: "default",
  IN_PROGRESS: "secondary",
  NOT_STARTED: "outline",
};

export default function FinalReview() {
  return (
    <StudentGate>
      <FinalReviewContent />
    </StudentGate>
  );
}

function FinalReviewContent() {
  const router = useRouter();
  const learning = useLearning();
  const { reflection, setReflection } = learning;
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setError("");
    try {
      await learning.saveReflection();
      setSaved(true);
    } catch {
      setError("Refleksi belum tersimpan. Periksa koneksi lalu coba lagi.");
    }
  };
  const leave = () => {
    if (learning.mode === "mock") learning.resetMock();
    else learning.logout();
    router.push("/");
  };
  const journey = useJourney();

  // Real scores come from the backend's stage evaluations (live mode only).
  const scoreOf = (caseId: string) => {
    let score = 0;
    let max = 0;
    for (const stage of stages) {
      const e = learning.evaluationFor(caseId, stage.id);
      if (e?.status === "COMPLETED") {
        score += e.totalScore ?? 0;
        max += e.maxScore;
      }
    }
    return max > 0 ? { score, max } : null;
  };
  const strengths = learning.aiEnabled
    ? Array.from(
        new Set(
          journey.cases.flatMap((c) =>
            stages.flatMap(
              (stage) =>
                learning.evaluationFor(c.item.id, stage.id)?.wentWell ?? [],
            ),
          ),
        ),
      ).slice(0, 5)
    : [];
  const defaultStrengths = [
    "Menguraikan masalah sebelum membuat kode",
    "Menghubungkan algoritma dengan implementasi",
    "Membaca bukti dari hasil pengujian",
  ];

  if (!journey.complete) {
    return (
      <Shell>
        <main className={cn(containerCls, "pb-12 pt-6 sm:pt-10")}>
          <Card
            className="mx-auto max-w-2xl bg-muted/60"
            data-testid="journey-locked-page"
          >
            <CardHeader>
              <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <Lock className="size-6" />
              </div>
              <CardTitle className="mt-3 font-heading text-2xl text-muted-foreground">
                Perjalananmu belum selesai
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {journey.allStagesDone
                  ? "Semua tahap sudah selesai. Halaman ini terbuka setelah evaluasi kasus terakhir dikonfirmasi oleh sistem."
                  : "Halaman ini terbuka setelah kamu menyelesaikan semua misi yang ditentukan untukmu."}
              </p>
              <ul className="space-y-2">
                {journey.cases.map((c) => (
                  <li
                    key={c.item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 px-3 py-2 text-sm"
                  >
                    <span>
                      Kasus {c.item.number} · {c.item.title}
                    </span>
                    <Badge variant={STATUS_VARIANT[c.status]}>
                      {STATUS_LABEL[c.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
              {journey.allStagesDone && journey.lastCaseId ? (
                <LinkButton href={`/case-review/${journey.lastCaseId}`}>
                  Lihat evaluasi kasus terakhir
                </LinkButton>
              ) : (
                journey.currentCaseId && (
                  <LinkButton href={`/mission/${journey.currentCaseId}`}>
                    Lanjutkan misi
                  </LinkButton>
                )
              )}
            </CardContent>
          </Card>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main className={cn(containerCls, "pb-12 pt-6 sm:pt-10")}>
        <div className="flex flex-col-reverse items-center gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              Perjalanan selesai
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">
              Kamu sudah membangun solusi dari awal.
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Gunakan ringkasan ini untuk melihat prosesmu, bukan hanya jawaban
              akhirnya.
            </p>
          </div>
          <Mascot
            variant="fullbody"
            alt="Maskot PyScaffold"
            className="w-36 shrink-0 sm:w-44"
          />
        </div>
        <div
          className={cn(
            "mt-8 grid gap-4",
            journey.cases.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2",
          )}
        >
          {journey.cases.map(({ item, status, completedStages }) => {
            const score = scoreOf(item.id);
            return (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="w-fit">
                      Kasus {item.number}
                    </Badge>
                    <Badge variant={STATUS_VARIANT[status]}>
                      {STATUS_LABEL[status]}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {completedStages} dari {stages.length} tahap selesai ·
                  dukungan {item.support}
                  {score && (
                    <span className="mt-1 block text-xs">
                      Skor sementara {score.score}/{score.max}
                    </span>
                  )}
                  <span className="mt-1 block text-xs">{CASE_CARD_NOTE}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Yang sudah dikuasai</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm leading-6">
                {(strengths.length > 0 ? strengths : defaultStrengths).map(
                  (t) => (
                    <li key={t} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {t}
                    </li>
                  ),
                )}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Refleksi singkat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="reflection">
                Apa satu hal yang ingin kamu latih lagi?
              </Label>
              <Textarea
                id="reflection"
                value={reflection}
                onChange={(e) => {
                  setReflection(e.target.value);
                  setSaved(false);
                }}
                rows={4}
              />
              {error && (
                <Alert variant="destructive">
                  <AlertDescription role="alert">{error}</AlertDescription>
                </Alert>
              )}
              <Button onClick={save}>
                {saved ? "Tersimpan ✓" : "Simpan refleksi"}
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 flex justify-end">
          <Button variant="ghost" onClick={leave}>
            {learning.mode === "mock" ? "Reset data mock & keluar" : "Keluar"}
          </Button>
        </div>
      </main>
    </Shell>
  );
}
