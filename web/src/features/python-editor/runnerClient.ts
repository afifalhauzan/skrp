import type { FromWorker, ToWorker } from "./protocol";
import type { ExecutionResult, PythonRunner, RunRequest } from "./types";

/** Pin must match the `pyodide` devDependency used by the tests. */
export const PYODIDE_VERSION = "0.27.7";
/** Self-hosted under public/pyodide (see scripts/copy-pyodide.mjs); override for a CDN. */
const DEFAULT_INDEX_URL = "/pyodide/";

export const DEFAULT_TIMEOUT_MS = 10_000;
const LOAD_TIMEOUT_MS = 90_000;

function indexUrl() {
  const url = process.env.NEXT_PUBLIC_PYODIDE_INDEX_URL || DEFAULT_INDEX_URL;
  return url.endsWith("/") ? url : `${url}/`;
}

function newRunId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `run-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Browser-side runner. One warm worker is reused between runs; it is thrown away
 * (and lazily recreated) after a timeout or an explicit stop.
 */
export function createPythonRunner(): PythonRunner {
  let worker: Worker | null = null;
  let current: { cancel: (reason: "stop") => void } | null = null;

  const spawn = () => {
    // Must stay a literal `new Worker(new URL(...))` so the bundler emits the worker.
    worker = new Worker(new URL("./pyodide.worker.ts", import.meta.url));
    const init: ToWorker = { type: "init", indexURL: indexUrl() };
    worker.postMessage(init);
    return worker;
  };
  const kill = () => {
    worker?.terminate();
    worker = null;
  };

  const run = (request: RunRequest): Promise<ExecutionResult> => {
    if (current)
      return Promise.reject(new Error("A run is already in progress"));
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const runId = newRunId();
    const startedAtIso = new Date().toISOString();
    const w = worker ?? spawn();

    return new Promise<ExecutionResult>((resolve) => {
      let startedAt = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let settled = false;

      const finish = (
        partial: Pick<
          ExecutionResult,
          "status" | "stdout" | "stderr" | "traceback" | "stdinExhausted"
        > &
          Partial<Pick<ExecutionResult, "stdinLines" | "runtimeVersion">>,
      ) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
        current = null;
        resolve({
          runId,
          source: request.source,
          stdin: request.stdin,
          stdinLines: partial.stdinLines ?? 0,
          durationMs: startedAt ? Math.round(performance.now() - startedAt) : 0,
          executedAt: startedAtIso,
          runtime: "pyodide",
          runtimeVersion: partial.runtimeVersion ?? null,
          ...partial,
        });
      };

      const failRuntime = (message: string) => {
        kill();
        finish({
          status: "unavailable",
          stdout: "",
          stderr: message,
          traceback: null,
          stdinExhausted: false,
        });
      };

      // Covers downloading and starting Pyodide; replaced by the run timeout on "started".
      timer = setTimeout(
        () =>
          failRuntime(
            "Runtime Python tidak selesai dimuat. Periksa koneksi internet lalu coba lagi.",
          ),
        LOAD_TIMEOUT_MS,
      );

      const onMessage = (event: MessageEvent<FromWorker>) => {
        const msg = event.data;
        if (msg.type === "init-error") {
          failRuntime(`Runtime Python gagal dimuat: ${msg.message}`);
        } else if (msg.type === "started" && msg.runId === runId) {
          startedAt = performance.now();
          clearTimeout(timer);
          timer = setTimeout(() => {
            kill();
            finish({
              status: "timeout",
              stdout: "",
              stderr: `Program dihentikan karena melebihi batas waktu ${Math.round(timeoutMs / 1000)} detik. Periksa apakah ada perulangan yang tidak pernah berhenti.`,
              traceback: null,
              stdinExhausted: false,
            });
          }, timeoutMs);
        } else if (msg.type === "result" && msg.runId === runId) {
          finish({
            status: msg.status,
            stdout: msg.stdout,
            stderr: msg.stderr,
            traceback: msg.traceback,
            stdinExhausted: msg.stdinExhausted,
            stdinLines: msg.stdinLines,
            runtimeVersion: msg.version,
          });
        }
      };
      const onError = (event: ErrorEvent) =>
        failRuntime(event.message || "Worker error");

      current = {
        cancel: () => {
          kill();
          finish({
            status: "error",
            stdout: "",
            stderr: "Eksekusi dihentikan.",
            traceback: null,
            stdinExhausted: false,
          });
        },
      };

      w.addEventListener("message", onMessage);
      w.addEventListener("error", onError);
      const message: ToWorker = {
        type: "run",
        runId,
        source: request.source,
        stdin: request.stdin,
      };
      w.postMessage(message);
    });
  };

  return {
    run,
    stop: () => current?.cancel("stop"),
    dispose: () => {
      current?.cancel("stop");
      kill();
    },
  };
}
