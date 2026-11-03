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
  const defaultStrengths = journey.complete
    ? [
        "Menguraikan masalah sebelum membuat kode",
        "Menghubungkan algoritma dengan implementasi",
        "Membaca bukti dari hasil pengujian",
      ]
    : [];
  const shownStrengths = strengths.length > 0 ? strengths : defaultStrengths;

  return (
    <Shell>
      <main className={cn(containerCls, "pb-12 pt-6 sm:pt-10")}>
        <div className="flex flex-col-reverse items-center gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              {journey.complete ? "Perjalanan selesai" : "Perjalanan saya"}
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">
              {journey.complete
                ? "Kamu sudah membangun solusi dari awal."
                : "Ini progres belajarmu sejauh ini."}
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {journey.complete
                ? "Gunakan ringkasan ini untuk melihat prosesmu, bukan hanya jawaban akhirnya."
                : "Misi berikutnya terbuka setelah misi sebelumnya selesai."}
            </p>
            {!journey.complete && journey.currentCaseId && (
              <LinkButton
                href={`/mission/${journey.currentCaseId}`}
                className="mt-4"
              >
                Lanjutkan misi
              </LinkButton>
            )}
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
          {journey.cases.map(({ item, status, completedStages, locked }) => {
            const score = scoreOf(item.id);
            return (
              <Card
                key={item.id}
                aria-disabled={locked || undefined}
                data-testid={locked ? "case-card-locked" : "case-card"}
                className={cn(locked && "bg-muted/60 text-muted-foreground")}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="w-fit">
                      Kasus {item.number}
                    </Badge>
                    {locked ? (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="size-3" /> Terkunci
                      </Badge>
                    ) : (
                      <Badge variant={STATUS_VARIANT[status]}>
                        {STATUS_LABEL[status]}
                      </Badge>
                    )}
                  </div>
                  <CardTitle
                    className={cn("mt-2", locked && "text-muted-foreground")}
                  >
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {locked ? (
                    <span>Terbuka setelah misi sebelumnya selesai.</span>
                  ) : (
                    <>
                      {completedStages} dari {stages.length} tahap selesai ·
                      dukungan {item.support}
                      {score && (
                        <span className="mt-1 block text-xs">
                          Skor sementara {score.score}/{score.max}
                        </span>
                      )}
                      <span className="mt-1 block text-xs">
                        {CASE_CARD_NOTE}
                      </span>
                    </>
                  )}
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
              {shownStrengths.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Selesaikan misimu untuk melihat apa saja yang sudah kamu
                  kuasai.
                </p>
              ) : (
                <ul className="space-y-3 text-sm leading-6">
                  {shownStrengths.map((t) => (
                    <li key={t} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {t}
                    </li>
                  ))}
                </ul>
              )}
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
