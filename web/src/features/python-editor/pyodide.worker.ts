import { initEngine, runWithPyodide, type PyodideLike } from "./engine";
import type { FromWorker, ToWorker } from "./protocol";

/**
 * Dedicated worker that owns the Pyodide runtime so a runaway `while True:` can
 * only ever block this thread; the page terminates the worker on timeout.
 * The page sends `init` (with the runtime URL) first, then `run` messages.
 */
declare function importScripts(...urls: string[]): void;
declare function loadPyodide(options: {
  indexURL: string;
}): Promise<PyodideLike>;

const scope = self as unknown as {
  postMessage(message: FromWorker): void;
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null;
};
const post = (message: FromWorker) => scope.postMessage(message);

let pyodide: PyodideLike | null = null;
let ready: Promise<void> = Promise.resolve();

scope.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type === "init") {
    ready = (async () => {
      try {
        importScripts(`${msg.indexURL}pyodide.js`);
        const instance = await loadPyodide({ indexURL: msg.indexURL });
        initEngine(instance);
        pyodide = instance;
        post({ type: "ready", version: instance.version });
      } catch (error) {
        post({
          type: "init-error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return;
  }
  await ready;
  if (!pyodide) return; // init-error already reported
  post({ type: "started", runId: msg.runId });
  const output = runWithPyodide(pyodide, msg.source, msg.stdin);
  post({
    type: "result",
    runId: msg.runId,
    version: pyodide.version,
    ...output,
  });
};
