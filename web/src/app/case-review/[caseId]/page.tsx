"use client";
import { ArrowRight, Check } from "lucide-react";
import { StudentGate } from "@/components/AsyncState";
import { LinkButton, Shell } from "@/components/Shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLearning } from "@/features/learning/LearningProvider";
import { cases, getCase, stages } from "@/lib/mock-data";
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
  const { progressFor } = useLearning();
  const done: string[] = progressFor(caseId)?.completedStages ?? [];
  const item = getCase(caseId);
  const complete = done.length === stages.length;
  const percent = Math.round((done.length / stages.length) * 100);
  const next = cases[cases.findIndex((c) => c.id === caseId) + 1]?.id ?? null;
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
        {complete && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Langkah berikutnya
              </p>
              <h2 className="font-heading text-xl font-semibold">
                {next
                  ? `Lanjut ke Kasus ${cases.find((c) => c.id === next)?.number}`
                  : "Kamu mencapai akhir pembelajaran"}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {next
                  ? "Kamu siap melanjutkan ke misi berikutnya."
                  : "Semua kasus utama telah diselesaikan."}
              </p>
              <LinkButton href={next ? `/mission/${next}` : "/final-review"}>
                {next ? "Lanjutkan misi" : "Lihat evaluasi akhir"}{" "}
                <ArrowRight />
              </LinkButton>
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
