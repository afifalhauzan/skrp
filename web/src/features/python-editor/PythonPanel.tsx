"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CodeEditor } from "./CodeEditor";
import { createPythonRunner } from "./runnerClient";
import {
  isResultCurrent,
  type ExecutionResult,
  type PythonRunner,
} from "./types";

interface Props {
  source: string;
  stdin: string;
  result: ExecutionResult | undefined;
  onSourceChange: (value: string) => void;
  onStdinChange: (value: string) => void;
  onResult: (result: ExecutionResult) => void;
  /** Autosave status line supplied by the caller, e.g. "Tersimpan (revisi 3)". */
  saveStatus?: string;
}

const STATUS_LABEL: Record<ExecutionResult["status"], string> = {
  ok: "Berhasil",
  error: "Error",
  timeout: "Timeout",
  unavailable: "Runtime tidak tersedia",
};

export function PythonPanel({
  source,
  stdin,
  result,
  onSourceChange,
  onStdinChange,
  onResult,
  saveStatus,
}: Props) {
  const runner = useRef<PythonRunner | null>(null);
  const [running, setRunning] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => () => runner.current?.dispose(), []);

  const run = async () => {
    runner.current ??= createPythonRunner();
    setRunning(true);
    try {
      const next = await runner.current.run({ source, stdin });
      setLoadedOnce(true);
      onResult(next);
    } finally {
      setRunning(false);
    }
  };

  const current = isResultCurrent(result, source, stdin);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Editor Python</Label>
        <CodeEditor value={source} onChange={onSourceChange} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="stdin">Input (stdin)</Label>
        <Textarea
          id="stdin"
          value={stdin}
          onChange={(e) => onStdinChange(e.target.value)}
          rows={3}
          spellCheck={false}
          placeholder={"mobil\n2"}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Satu nilai per baris, sesuai urutan pemanggilan <code>input()</code>{" "}
          pada programmu.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run} disabled={running}>
          {running ? <Loader2 className="animate-spin" /> : <Play />}
          {running ? "Menjalankan…" : "Jalankan kode"}
        </Button>
        {running && (
          <Button variant="outline" onClick={() => runner.current?.stop()}>
            <Square /> Hentikan
          </Button>
        )}
        {running && !loadedOnce && (
          <span className="text-xs text-muted-foreground">
            Memuat runtime Python pertama kali…
          </span>
        )}
        {saveStatus && (
          <span className="ml-auto text-xs text-muted-foreground">
            {saveStatus}
          </span>
        )}
      </div>

      <OutputPanel result={result} stale={!!result && !current} />
    </div>
  );
}

function OutputPanel({
  result,
  stale,
}: {
  result: ExecutionResult | undefined;
  stale: boolean;
}) {
  if (!result) {
    return (
      <div className="rounded-xl bg-zinc-950 p-4 font-mono text-sm text-zinc-400">
        Belum ada hasil. Tekan “Jalankan kode” untuk mengeksekusi kodemu.
      </div>
    );
  }
  const missingInput = result.stdinExhausted;
  return (
    <div
      className={cn(
        "rounded-xl bg-zinc-950 p-4 font-mono text-sm text-emerald-200",
        stale && "opacity-60",
      )}
      aria-live="polite"
      data-testid="output-panel"
    >
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold uppercase tracking-wide text-zinc-400">
          Terminal
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-semibold",
            result.status === "ok"
              ? "bg-emerald-900 text-emerald-100"
              : "bg-red-950 text-red-200",
          )}
        >
          {STATUS_LABEL[result.status]}
        </span>
        <span className="text-zinc-400">{result.durationMs} ms</span>
      </div>

      {stale && (
        <p className="mb-3 rounded-md border border-amber-200/40 p-2 text-xs text-amber-200">
          Hasil ini berasal dari versi kode atau input sebelumnya. Jalankan lagi
          untuk melihat hasil terbaru.
        </p>
      )}

      {result.stdout && (
        <pre className="whitespace-pre-wrap">{result.stdout}</pre>
      )}
      {!result.stdout && result.status === "ok" && (
        <p className="text-zinc-400">
          (program selesai tanpa mencetak apa pun)
        </p>
      )}
      {result.stderr && (
        <pre className="mt-2 whitespace-pre-wrap text-red-300">
          {result.stderr}
        </pre>
      )}
      {result.traceback && (
        <pre className="mt-2 whitespace-pre-wrap text-red-400">
          {result.traceback}
        </pre>
      )}
      {missingInput && (
        <p className="mt-3 rounded-md border border-amber-200/50 p-2 text-xs text-amber-200">
          Program meminta input ke-{result.stdinLines + 1}, tetapi hanya{" "}
          {result.stdinLines} baris yang diisi di panel Input (stdin). Tambahkan
          satu baris untuk setiap pemanggilan <code>input()</code>.
        </p>
      )}
      <p className="mt-3 text-[11px] text-zinc-400">
        Dijalankan di browsermu dengan Pyodide
        {result.runtimeVersion ? ` ${result.runtimeVersion}` : ""}. Hasil ini
        bukan bukti penilaian yang terverifikasi.
      </p>
    </div>
  );
}
