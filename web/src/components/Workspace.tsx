"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Assistant } from "./Assistant";
import { StudentGate } from "./AsyncState";
import { Button, Card, Label, Shell } from "./Shell";
import { ProgressBar } from "./ProgressBar";
import { PythonPanel } from "@/features/python-editor/PythonPanel";
import { useLearning } from "@/features/learning/LearningProvider";
import { getCase, stages } from "@/lib/mock-data";
import type { ProblemSpec, StageId } from "@/lib/types";

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
  const [testsRun, setTestsRun] = useState(completed.includes("test"));

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

  const go = (id: StageId) => router.push(`/learn/${caseId}/${id}`);
  const nextStage = stages[stages.findIndex((s) => s.id === current) + 1];
  const title = stages.find((s) => s.id === current)?.label ?? "";

  const canContinue =
    current === "understand"
      ? Object.values(spec).every(Boolean)
      : current === "design"
        ? Boolean(pseudocode.trim())
        : current === "implement"
          ? Boolean(draft.run)
          : testsRun;

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

  return (
    <Shell>
      <main className="mx-auto max-w-[1024px] px-8 pb-12 pt-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 bg-black px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white">
              [ Kasus {String(item.number).padStart(2, "0")} Aktif ]
            </p>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-ink">
              {item.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{item.context}</p>
          </div>
          <Button variant="secondary" href={`/case-review/${caseId}`}>
            [ Lihat Progres ]
          </Button>
        </div>
        <ProgressBar
          caseId={caseId}
          current={current}
          completed={completed}
          onNavigate={go}
        />
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_290px]">
          <div>
            <Card>
              <div className="mb-6 flex items-start justify-between border-b border-[#dfe8f1] pb-5">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    Tahap {stages.findIndex((s) => s.id === current) + 1} {"//"}{" "}
                    Workspace
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-ink">{title}</h2>
                </div>
                <span className="blueprint-label px-3 py-2">
                  {completed.includes(current) ? "Selesai" : "Aktif"}
                </span>
              </div>
              {current === "understand" && (
                <Understand
                  spec={spec}
                  onChange={(value) => learning.setSpec(caseId, value)}
                />
              )}
              {current === "design" && (
                <Design
                  value={pseudocode}
                  onChange={(value) => learning.setPseudocode(caseId, value)}
                />
              )}
              {current === "implement" && (
                <PythonPanel
                  source={draft.source}
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
                <Test
                  item={item}
                  tested={testsRun}
                  onRetry={() => setTestsRun(true)}
                />
              )}
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#dfe8f1] pt-5">
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${learning.saveState === "error" || message.startsWith("Gagal") ? "text-coral" : "text-muted"}`}
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
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={saveDraft}
                    disabled={busy}
                  >
                    {completed.includes(current)
                      ? "Simpan Perubahan"
                      : "Simpan Draf"}
                  </Button>
                  <Button onClick={advance} disabled={!canContinue || busy}>
                    {nextStage
                      ? `Lanjut ke ${nextStage.short}`
                      : "Selesaikan Kasus"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
          <div className="space-y-5">
            <Assistant stage={title} />
            <Card>
              <p className="blueprint-label inline-block px-2 py-1">
                Tujuan Misi
              </p>
              <p className="mt-3 text-sm leading-6 text-ink">{item.goal}</p>
              <p className="mt-4 font-mono text-[10px] leading-5 text-muted">
                MOCK PROTOTYPE: kriteria selesai menandai artefak terisi dan
                bukan evaluasi pedagogis final.
              </p>
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
    <div className="space-y-5">
      {fields.map(([key, label, placeholder]) => (
        <div key={key}>
          <Label>{label}</Label>
          <textarea
            aria-label={label}
            value={spec[key]}
            onChange={(e) => onChange({ ...spec, [key]: e.target.value })}
            placeholder={placeholder}
            rows={2}
            className="w-full resize-y rounded-xl border border-[#d8e4dd] bg-[#fbfdfb] p-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-mint"
          />
        </div>
      ))}
    </div>
  );
}
function Design({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[#f2f7f3] p-4 text-sm leading-6 text-muted">
        Susun algoritma dalam langkah-langkah singkat. Flowchart visual lengkap
        akan menjadi pengembangan berikutnya; area ini adalah representasi
        placeholder yang dapat diedit.
      </div>
      <div>
        <Label>Pseudocode</Label>
        <textarea
          aria-label="Pseudocode"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            "MULAI\\nBaca input...\\nHitung...\\nTampilkan hasil\\nSELESAI"
          }
          rows={12}
          className="w-full rounded-xl border border-[#d8e4dd] bg-[#17252e] p-4 font-mono text-sm leading-6 text-[#d8f5e5] outline-none focus:border-teal"
        />
      </div>
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
      <p className="mb-4 text-sm text-muted">
        Periksa output aktual dan bandingkan dengan ekspektasi. Hasil di bawah
        adalah fixture pengujian mock.
      </p>
      <div className="overflow-hidden rounded-xl border border-[#dce8e0]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f2f7f3] text-xs uppercase text-muted">
            <tr>
              <th className="p-3">Input</th>
              <th className="p-3">Ekspektasi</th>
              <th className="p-3">Aktual</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {item.tests.map((test) => (
              <tr key={test.id} className="border-t border-[#e6eee9]">
                <td className="p-3">{test.input}</td>
                <td className="p-3">{test.expected}</td>
                <td className="p-3">{test.actual}</td>
                <td className="p-3 font-bold text-teal">
                  {test.passed ? "Lulus" : "Perlu revisi"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5">
        <Button variant="secondary" onClick={onRetry}>
          {tested ? "Uji ulang simulasi" : "Jalankan semua tes"}
        </Button>
      </div>
    </div>
  );
}
