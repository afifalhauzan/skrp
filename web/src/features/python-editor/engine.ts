/**
 * Runtime-agnostic core of the Python runner. It only needs the small slice of the
 * Pyodide API declared below, so it runs unchanged in the browser worker and under
 * Node (tests). It never rewrites the student's source.
 */

export interface PyodideLike {
  version: string;
  runPython(code: string, options?: { globals?: unknown }): unknown;
  globals: { get(name: string): unknown };
  setStdin(options: {
    stdin: () => string | null | undefined;
    isatty?: boolean;
  }): void;
  /** `raw` receives one byte at a time, so partial lines (prompts, end="") are not lost. */
  setStdout(options: { raw: (byte: number) => void }): void;
  setStderr(options: { raw: (byte: number) => void }): void;
}

export interface EngineOutput {
  status: "ok" | "error";
  stdout: string;
  stderr: string;
  traceback: string | null;
  stdinExhausted: boolean;
  stdinLines: number;
}

const HARNESS_FILENAME = "main.py";

/**
 * Runs the student's code in a fresh namespace. The traceback is trimmed to the
 * student's own frames (hiding Pyodide internals) and returned separately from stderr.
 */
const HARNESS = `
import sys, traceback

def __skrp_run(source, filename):
    namespace = {"__name__": "__main__"}
    try:
        exec(compile(source, filename, "exec"), namespace)
        return None
    except SystemExit:
        return None
    except BaseException as exc:
        tb = exc.__traceback__
        while tb is not None and tb.tb_frame.f_code.co_filename != filename:
            tb = tb.tb_next
        return "".join(traceback.format_exception(type(exc), exc, tb))
    finally:
        try:
            sys.stdout.flush()
            sys.stderr.flush()
        except Exception:
            pass
`;

/** One input() call consumes one line. A trailing newline does not add an empty line. */
export function splitStdin(stdin: string): string[] {
  if (stdin === "") return [];
  const lines = stdin.replace(/\r\n?/g, "\n").split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

const decoder = new TextDecoder("utf-8");
/** Bytes -> text, without the final newline that every print() leaves behind. */
function decode(bytes: number[]): string {
  return decoder.decode(Uint8Array.from(bytes)).replace(/\n$/, "");
}

export function initEngine(pyodide: PyodideLike) {
  pyodide.runPython(HARNESS);
}

export function runWithPyodide(
  pyodide: PyodideLike,
  source: string,
  stdin: string,
): EngineOutput {
  const lines = splitStdin(stdin);
  let next = 0;
  let stdinExhausted = false;
  const out: number[] = [];
  const err: number[] = [];

  pyodide.setStdin({
    // Returning null signals EOF, which makes Python raise EOFError from input().
    stdin: () => {
      if (next < lines.length) return lines[next++] as string;
      stdinExhausted = true;
      return null;
    },
    isatty: false,
  });
  pyodide.setStdout({ raw: (byte) => out.push(byte) });
  pyodide.setStderr({ raw: (byte) => err.push(byte) });

  const harness = pyodide.globals.get("__skrp_run") as (
    s: string,
    f: string,
  ) => string | null | undefined;
  let traceback: string | null = null;
  try {
    traceback = harness(source, HARNESS_FILENAME) ?? null;
  } catch (error) {
    // The harness itself should not throw; if it does, surface it instead of hiding it.
    traceback = error instanceof Error ? error.message : String(error);
  }

  return {
    status: traceback ? "error" : "ok",
    stdout: decode(out),
    stderr: decode(err),
    traceback,
    stdinExhausted,
    stdinLines: lines.length,
  };
}
