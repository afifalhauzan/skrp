import type { ExecutionResult } from "./types";

const TIMEOUT_MS = 10_000;
let worker: Worker | null = null;
let seq = 0;

function getWorker() {
  if (!worker) worker = new Worker("/pyodide-worker.js", { type: "module" });
  return worker;
}

function request(
  message: { type: "warmup" } | { type: "run"; code: string; stdin: string },
  timeoutMs?: number,
): Promise<ExecutionResult | null> {
  return new Promise((resolve) => {
    const w = getWorker();
    const id = ++seq;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = (value: ExecutionResult | null) => {
      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      resolve(value);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.data.id !== id) return;
      if (e.data.type === "ready") done(null);
      else if (e.data.type === "result")
        done({
          stdout: e.data.stdout,
          error: e.data.error,
          durationMs: e.data.durationMs,
        });
      else
        done({
          stdout: "",
          error: `Python tidak bisa dimuat: ${e.data.error}`,
        });
    };
    const onError = () =>
      done({
        stdout: "",
        error: "Python tidak bisa dimuat. Coba muat ulang halaman.",
      });
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    if (timeoutMs)
      timer = setTimeout(() => {
        // Runaway program (e.g. infinite loop): kill the worker, a new one starts on next run.
        w.terminate();
        worker = null;
        done({
          stdout: "",
          error: `Program berjalan lebih dari ${timeoutMs / 1000} detik dan dihentikan. Periksa apakah ada perulangan yang tidak berhenti.`,
        });
      }, timeoutMs);
    w.postMessage({ id, ...message });
  });
}

/** Start downloading/initialising Pyodide in the background. */
export function warmupPython() {
  void request({ type: "warmup" });
}

export function runPython(code: string, stdin: string) {
  return request(
    { type: "run", code, stdin },
    TIMEOUT_MS,
  ) as Promise<ExecutionResult>;
}
