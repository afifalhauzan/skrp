"use client";
import { containerCls } from "@/lib/ui";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Assistant } from "./Assistant";
import { LinkButton, Shell } from "./Shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FlowchartEditor } from "./FlowchartEditor";
import { ProgressBar } from "./ProgressBar";
import {
  blankSpec,
  defaultCode,
  getFlowchartDraft,
  initialProgress,
  getCase,
  stages,
} from "@/lib/data";
import { loadProgress, saveProgress } from "@/lib/persistence";
import type {
  Flowchart,
  ProblemSpec,
  ProgressState,
  StageId,
} from "@/lib/types";

export function Workspace({
  caseId,
  stageId,
}: {
  caseId: string;
  stageId: string;
}) {
  const router = useRouter();
  const item = getCase(caseId);
  const current = (
    stages.some((s) => s.id === stageId) ? stageId : "understand"
  ) as StageId;
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setProgress(loadProgress());
    setReady(true);
  }, []);
  const [message, setMessage] = useState("");
  const completed = progress.completedStages[caseId] ?? [];
  const spec = progress.problemSpecs[caseId] ?? blankSpec;
  const update = (next: ProgressState) => {
    if (!ready) return;
    setProgress(next);
    saveProgress(next);
  };
  useEffect(() => {
    if (!ready) return;
    if (!progress.loggedIn) {
      router.replace("/login");
      return;
    }
    const stageIndex = stages.findIndex((stage) => stage.id === current);
    const firstIncomplete = stages.findIndex(
      (stage) => !completed.includes(stage.id),
    );
    if (stageIndex > firstIncomplete && firstIncomplete >= 0) {
      router.replace(`/learn/${caseId}/${stages[firstIncomplete].id}`);
    }
  }, [caseId, completed, current, progress.loggedIn, ready, router]);
  const go = (id: StageId) => router.push(`/learn/${caseId}/${id}`);
  const markComplete = (id: StageId) => {
    const next = Array.from(
      new Set([...(progress.completedStages[caseId] ?? []), id]),
    );
    update({
      ...progress,
      completedStages: { ...progress.completedStages, [caseId]: next },
    });
    setMessage("Tersimpan. Tahap ini selesai.");
  };
  const canContinue =
    current === "understand"
      ? Object.values(spec).every(Boolean)
      : current === "design"
        ? Boolean(progress.pseudocode[caseId]?.trim())
        : current === "implement"
          ? Boolean(progress.execution[caseId])
          : Boolean(progress.tested[caseId]);
  const nextStage = stages[stages.findIndex((s) => s.id === current) + 1];
  const title = stages.find((s) => s.id === current)?.label ?? "";
  return (
    <Shell>
      <main className={cn(containerCls, "pb-12 pt-5 sm:pt-8")}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge>Kasus {item.number} aktif</Badge>
            <h1 className="mt-2 font-heading text-xl font-bold sm:text-2xl">
              {item.title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {item.context}
            </p>
          </div>
          <LinkButton href={`/case-review/${caseId}`} variant="outline">
            Lihat progres
          </LinkButton>
        </div>
        <ProgressBar
          caseId={caseId}
          current={current}
          completed={completed}
          onNavigate={go}
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_290px]">
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
                  onChange={(value) =>
                    update({
                      ...progress,
                      problemSpecs: {
                        ...progress.problemSpecs,
                        [caseId]: value,
                      },
                    })
                  }
                />
              )}
              {current === "design" && (
                <Design
                  caseId={caseId}
                  value={progress.pseudocode[caseId] ?? ""}
                  flowchart={progress.flowchart[caseId]}
                  onChange={(value) =>
                    update({
                      ...progress,
                      pseudocode: { ...progress.pseudocode, [caseId]: value },
                    })
                  }
                  onFlowchartChange={(value) =>
                    update({
                      ...progress,
                      flowchart: { ...progress.flowchart, [caseId]: value },
                    })
                  }
                />
              )}
              {current === "implement" && (
                <Implement
                  code={progress.code[caseId] ?? defaultCode}
                  result={progress.execution[caseId]}
                  onChange={(value) =>
                    update({
                      ...progress,
                      code: { ...progress.code, [caseId]: value },
                    })
                  }
                  onRun={() =>
                    update({
                      ...progress,
                      execution: {
                        ...progress.execution,
                        [caseId]: {
                          stdout: "Tarif: 10000\nProgram selesai tanpa error.",
                          simulated: true,
                        },
                      },
                    })
                  }
                />
              )}
              {current === "test" && (
                <Test
                  item={item}
                  tested={Boolean(progress.tested[caseId])}
                  onRetry={() =>
                    update({
                      ...progress,
                      tested: { ...progress.tested, [caseId]: true },
                    })
                  }
                />
              )}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <span className="text-sm text-muted-foreground">{message}</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => go(current)}>
                    {completed.includes(current)
                      ? "Simpan perubahan"
                      : "Simpan draf"}
                  </Button>
                  <Button
                    onClick={() => {
                      markComplete(current);
                      if (nextStage) go(nextStage.id);
                      else router.push(`/case-review/${caseId}`);
                    }}
                    disabled={!canContinue}
                  >
                    {nextStage
                      ? `Lanjut ke ${nextStage.short}`
                      : "Selesaikan kasus"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Assistant stage={title} />
            <Card>
              <CardContent>
                <Badge variant="secondary">Tujuan misi</Badge>
                <p className="mt-3 text-sm leading-6">{item.goal}</p>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Tahap ditandai selesai setelah hasil kerjanya terisi.
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
const codeAreaCls =
  "font-mono text-sm leading-6 rounded-xl border-zinc-800 bg-zinc-950 p-4 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-primary";
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            "MULAI\nBaca input...\nHitung...\nTampilkan hasil\nSELESAI"
          }
          rows={10}
          spellCheck={false}
          className={codeAreaCls}
        />
      </div>
    </div>
  );
}
function Implement({
  code,
  result,
  onChange,
  onRun,
}: {
  code: string;
  result?: { stdout: string; error?: string };
  onChange: (value: string) => void;
  onRun: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="python-editor">Editor Python</Label>
        <Textarea
          id="python-editor"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          rows={14}
          spellCheck={false}
          className={codeAreaCls}
        />
      </div>
      <Button onClick={onRun}>
        <Play /> Jalankan kode
      </Button>
      {result && (
        <div className="rounded-xl bg-zinc-950 p-4 text-sm text-emerald-200">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Terminal
          </p>
          <pre className="whitespace-pre-wrap font-mono">{result.stdout}</pre>
          {result.error && (
            <p className="mt-2 font-mono text-red-400">{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
function Test({
  item,
  tested,
  onRetry,
}: {
  item: ReturnType<typeof getCase>;
  tested: boolean;
  onRetry: () => void;
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Periksa output aktual dan bandingkan dengan ekspektasi.
      </p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Input</th>
              <th className="p-3">Ekspektasi</th>
              <th className="p-3">Aktual</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {item.tests.map((test) => (
              <tr key={test.id} className="border-t">
                <td className="p-3">{test.input}</td>
                <td className="p-3 font-mono">{test.expected}</td>
                <td className="p-3 font-mono">{test.actual}</td>
                <td className="p-3">
                  <Badge variant={test.passed ? "default" : "destructive"}>
                    {test.passed ? "Lulus" : "Perlu revisi"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <Button variant="outline" onClick={onRetry}>
          {tested ? "Uji ulang" : "Jalankan semua tes"}
        </Button>
      </div>
    </div>
  );
}
