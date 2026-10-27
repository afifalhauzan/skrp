"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Label } from "@/components/Shell";
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
    <div className="space-y-5">
      <div>
        <Label>Editor Python</Label>
        <CodeEditor value={source} onChange={onSourceChange} />
      </div>

      <div>
        <label
          htmlFor="stdin"
          className="mb-1 block text-sm font-bold text-navy"
        >
          Input (stdin)
        </label>
        <p className="mb-2 text-xs text-muted">
          Satu nilai per baris, sesuai urutan pemanggilan <code>input()</code>{" "}
          pada programmu.
        </p>
        <textarea
          id="stdin"
          value={stdin}
          onChange={(e) => onStdinChange(e.target.value)}
          rows={4}
          spellCheck={false}
          placeholder={"mobil\n2"}
          className="w-full rounded-xl border border-[#d8e4dd] bg-[#fbfdfb] p-3 font-mono text-sm leading-6 outline-none focus:border-teal focus:ring-2 focus:ring-mint"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={running}>
          {running ? "Menjalankan…" : "▶ Jalankan"}
        </Button>
        {running && (
          <Button variant="secondary" onClick={() => runner.current?.stop()}>
            ■ Hentikan
          </Button>
        )}
        {running && !loadedOnce && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Memuat runtime Python pertama kali…
          </span>
        )}
        {saveStatus && (
          <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted">
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
      <div className="rounded-xl bg-[#111c22] p-4 font-mono text-sm text-[#8cb99e]">
        Belum ada hasil. Tekan “Jalankan” untuk mengeksekusi kodemu.
      </div>
    );
  }
  const missingInput = result.stdinExhausted;
  return (
    <div
      className={`rounded-xl bg-[#111c22] p-4 font-mono text-sm text-[#c6f6d8] ${stale ? "opacity-60" : ""}`}
      aria-live="polite"
      data-testid="output-panel"
    >
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="font-bold uppercase tracking-widest text-[#8cb99e]">
          Output
        </span>
        <span
          className={`px-2 py-1 font-bold uppercase tracking-widest ${result.status === "ok" ? "bg-[#1f4d3a] text-[#c6f6d8]" : "bg-[#5a2a24] text-[#ffd0c7]"}`}
        >
          {STATUS_LABEL[result.status]}
        </span>
        <span className="text-[#8cb99e]">{result.durationMs} ms</span>
      </div>

      {stale && (
        <p className="mb-3 border border-[#8cb99e]/40 p-2 text-xs text-[#ffe9a8]">
          Hasil ini berasal dari versi kode atau input sebelumnya. Jalankan lagi
          untuk melihat hasil terbaru.
        </p>
      )}

      {result.stdout && (
        <pre className="whitespace-pre-wrap">{result.stdout}</pre>
      )}
      {!result.stdout && result.status === "ok" && (
        <p className="text-[#8cb99e]">
          (program selesai tanpa mencetak apa pun)
        </p>
      )}
      {result.stderr && (
        <pre className="mt-2 whitespace-pre-wrap text-[#ffd0c7]">
          {result.stderr}
        </pre>
      )}
      {result.traceback && (
        <pre className="mt-2 whitespace-pre-wrap text-[#ffb3a5]">
          {result.traceback}
        </pre>
      )}
      {missingInput && (
        <p className="mt-3 border border-[#ffe9a8]/50 p-2 text-xs text-[#ffe9a8]">
          Program meminta input ke-{result.stdinLines + 1}, tetapi hanya{" "}
          {result.stdinLines} baris yang diisi di panel Input (stdin). Tambahkan
          satu baris untuk setiap pemanggilan <code>input()</code>.
        </p>
      )}
      <p className="mt-3 text-[10px] text-[#8cb99e]">
        Dijalankan di browsermu dengan Pyodide
        {result.runtimeVersion ? ` ${result.runtimeVersion}` : ""}. Hasil ini
        bukan bukti penilaian yang terverifikasi.
      </p>
    </div>
  );
}
