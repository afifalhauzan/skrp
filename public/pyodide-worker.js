// Runs Python via self-hosted Pyodide off the main thread, so the UI stays
// responsive and the main thread can terminate runaway programs.
import { loadPyodide } from "/pyodide/pyodide.mjs";

let pyodidePromise;
function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({ indexURL: "/pyodide/" });
  }
  return pyodidePromise;
}

function cleanTraceback(message) {
  const lines = String(message).split("\n");
  const start = lines.findIndex((l) => l.includes('File "<exec>"'));
  if (start === -1)
    return lines.filter(Boolean).slice(-1)[0] || String(message);
  return ["Traceback (most recent call last):", ...lines.slice(start)]
    .join("\n")
    .trim();
}

self.onmessage = async (event) => {
  const { id, type, code, stdin } = event.data;
  try {
    const pyodide = await getPyodide();
    if (type === "warmup") {
      self.postMessage({ id, type: "ready" });
      return;
    }
    // Collect raw output bytes so prompts without a newline stay inline, and echo
    // each stdin line after its prompt like a terminal would.
    let out = "";
    const bytes = [];
    const decoder = new TextDecoder();
    const flush = () => {
      if (bytes.length) out += decoder.decode(new Uint8Array(bytes.splice(0)));
    };
    const lines = String(stdin ?? "").split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    let next = 0;
    pyodide.setStdin({
      stdin: () => {
        if (next >= lines.length) return undefined;
        flush();
        out += lines[next] + "\n";
        return lines[next++];
      },
    });
    pyodide.setStdout({ raw: (b) => bytes.push(b & 255) });
    pyodide.setStderr({ raw: (b) => bytes.push(b & 255) });
    const started = performance.now();
    const globals = pyodide.globals.get("dict")();
    let error;
    try {
      await pyodide.runPythonAsync(code, { globals });
    } catch (e) {
      error = cleanTraceback(e && e.message ? e.message : e);
    } finally {
      globals.destroy();
    }
    flush();
    self.postMessage({
      id,
      type: "result",
      stdout: out.replace(/\n+$/, ""),
      error,
      durationMs: Math.round(performance.now() - started),
    });
  } catch (e) {
    self.postMessage({
      id,
      type: "fatal",
      error: String((e && e.message) || e),
    });
  }
};
