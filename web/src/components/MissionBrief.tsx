"use client";
import { ArrowRight, CheckCircle2, Clock, Users } from "lucide-react";
import { StudentGate } from "@/components/AsyncState";
import { LinkButton, Shell } from "@/components/Shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLearning } from "@/features/learning/LearningProvider";
import { cases } from "@/lib/mock-data";
import { containerCls } from "@/lib/ui";
import type { SupportLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const artifacts = [
  "Spesifikasi masalah: tujuan, input, proses, output, batasan",
  "Rancangan algoritma (flowchart dan pseudocode)",
  "Program Python yang dapat dijalankan",
  "Hasil pengujian untuk beberapa skenario",
];
const support: Record<SupportLevel, { label: string; note: string }> = {
  HIGH: {
    label: "Dukungan tinggi",
    note: "Kamu mendapat draf flowchart lengkap dan kerangka kode sebagai titik awal.",
  },
  MODERATE: {
    label: "Dukungan sedang",
    note: "Kamu mendapat kerangka flowchart dan kode; sisanya kamu lengkapi sendiri.",
  },
  LOW: {
    label: "Dukungan rendah",
    note: "Hanya kerangka minimal yang disediakan; rancang dan tulis solusinya sendiri.",
  },
};

export function MissionBrief({ caseId }: { caseId: string }) {
  return (
    <StudentGate>
      <Briefing caseId={caseId} />
    </StudentGate>
  );
}

function Briefing({ caseId }: { caseId: string }) {
  const { student, mode } = useLearning();
  const item = cases.find((c) => c.id === caseId) ?? cases[0];
  return (
    <Shell>
      <main className={cn(containerCls, "space-y-4 pb-12 pt-6 sm:pt-10")}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>
            Kasus {item.number} dari {cases.length}
          </Badge>
          <Badge variant="secondary">{support[item.support].label}</Badge>
          <Badge variant="outline">
            <Users />
            <span data-testid="mission-student">
              {student?.name ?? "Siswa"} ({student?.studentCode})
              {student?.className ? ` · ${student.className}` : ""}
            </span>
          </Badge>
          <Badge variant="outline">
            <Clock /> {item.minutes} menit
          </Badge>
        </div>
        <h1 className="font-heading text-2xl font-bold leading-tight sm:text-3xl">
          Misi {item.number}: {item.title}
        </h1>
        <Card>
          <CardHeader>
            <CardDescription>
              Konteks dunia nyata · {item.place}
            </CardDescription>
          </CardHeader>
          <CardContent className="leading-6">{item.scenario}</CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tujuan misi</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6">
              {item.goal}
              <p className="mt-3 text-muted-foreground">
                Kriteria lulus: semua {item.tests.length} skenario uji berhasil.
              </p>
              <p className="mt-3 text-muted-foreground">
                {support[item.support].note}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Hasil yang dikumpulkan</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm leading-6">
                {artifacts.map((a) => (
                  <li key={a} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    {a}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Aturan &amp; format</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6">
                {item.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              <strong className="text-foreground">Butuh bantuan?</strong> Di
              setiap tahap ada tombol &quot;Minta petunjuk&quot; di panel
              samping. Progresmu tersimpan otomatis (
              {mode === "mock" ? "memori lokal / mock" : "server"}).
            </p>
            <LinkButton href={`/learn/${item.id}/understand`} size="lg">
              Mulai misi: tahap 1 <ArrowRight />
            </LinkButton>
          </CardContent>
        </Card>
      </main>
    </Shell>
  );
}
