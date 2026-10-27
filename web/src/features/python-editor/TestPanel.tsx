"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClientTestResult } from "@skrp/shared";
import type { TestCase } from "@/lib/types";
import { judge, type TestOutcome, type TestStatus } from "./judge";
import { createPythonRunner } from "./runnerClient";
import type { PythonRunner } from "./types";

const STATUS: Record<
  TestStatus,
  { label: string; variant: "default" | "destructive" | "secondary" }
> = {
  pass: { label: "Lulus", variant: "default" },
  fail: { label: "Belum sesuai", variant: "destructive" },
  error: { label: "Error", variant: "destructive" },
  timeout: { label: "Timeout", variant: "destructive" },
  unavailable: { label: "Tidak tersedia", variant: "secondary" },
};

interface Props {
  tests: TestCase[];
  /** The student's current code, as written in the implementation stage. */
  source: string;
  /** Called after each full run: true when every test passed for this exact source. */
  onComplete: (
    allPassed: boolean,
    source: string,
    results: ClientTestResult[],
  ) => void;
  /** Takes the student back to the editor to fix the code. */
  onEditCode: () => void;
}

/** Runs the student's code against every test case in Pyodide and shows the verdicts. */
export function TestPanel({ tests, source, onComplete, onEditCode }: Props) {
  const runner = useRef<PythonRunner | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, TestOutcome>>({});
  const [ranSource, setRanSource] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const running = runningId !== null;

  useEffect(() => () => runner.current?.dispose(), []);

  const runAll = async () => {
    runner.current ??= createPythonRunner();
    const snapshot = source;
    const next: Record<string, TestOutcome> = {};
    setOutcomes({});
    setRanSource(snapshot);
    for (const test of tests) {
      setRunningId(test.id);
      const result = await runner.current.run({
        source: snapshot,
        stdin: test.stdin,
      });
      next[test.id] = judge(result, test.expected);
      setOutcomes({ ...next });
      // No point retrying the remaining tests if Python itself cannot start.
      if (next[test.id].status === "unavailable") break;
    }
    setRunningId(null);
    onComplete(
      tests.every((t) => next[t.id]?.status === "pass"),
      snapshot,
      // Browser-reported outcomes: sent to the backend as unverified evidence.
      tests
        .filter((t) => next[t.id])
        .map((t) => ({
          testId: t.id,
          passed: next[t.id]!.status === "pass",
          actual: next[t.id]!.actual?.slice(0, 500),
        })),
    );
  };

  const done = Object.keys(outcomes).length;
  const passed = Object.values(outcomes).filter(
    (o) => o.status === "pass",
  ).length;
  const finished = ranSource !== null && !running && done > 0;
  const stale = ranSource !== null && ranSource !== source;
  const allPassed = finished && passed === tests.length;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Skenario</th>
              <th className="p-3">Input</th>
              <th className="p-3">Ekspektasi</th>
              <th className="p-3">Aktual</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => {
              const outcome = outcomes[test.id];
              return (
                <tr key={test.id} className="border-t align-top">
                  <td className="p-3">{test.label}</td>
                  <td className="whitespace-pre p-3 font-mono text-xs">
                    {test.stdin}
                  </td>
                  <td className="p-3 font-mono">{test.expected}</td>
                  <td className="p-3 font-mono">
                    {outcome ? (
                      <>
                        {outcome.actual || (
                          <span className="text-muted-foreground">
                            (kosong)
                          </span>
                        )}
                        {outcome.message && (
                          <p className="mt-1 font-sans text-xs text-destructive">
                            {outcome.message}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">–</span>
                    )}
                  </td>
                  <td className="p-3">
                    {runningId === test.id ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : outcome ? (
                      <Badge variant={STATUS[outcome.status].variant}>
                        {STATUS[outcome.status].label}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Belum diuji</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runAll} disabled={running}>
          {running ? <Loader2 className="animate-spin" /> : <Play />}
          {running
            ? `Menguji ${done + 1} dari ${tests.length}…`
            : ranSource === null
              ? "Jalankan semua tes"
              : "Uji ulang"}
        </Button>
        <Button variant="outline" onClick={onEditCode} disabled={running}>
          Perbaiki kode di editor
        </Button>
      </div>

      {finished && (
        <Alert variant={allPassed ? "default" : "destructive"}>
          {allPassed ? <CheckCircle2 /> : <XCircle />}
          <AlertDescription>
            {allPassed
              ? `Semua ${tests.length} skenario lulus. Kamu bisa menyelesaikan kasus ini.`
              : `${passed} dari ${tests.length} skenario lulus. Bandingkan output aktual dengan ekspektasi, perbaiki kodenya, lalu uji ulang.`}
            {stale && " Kodemu berubah sejak pengujian terakhir; uji ulang."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
