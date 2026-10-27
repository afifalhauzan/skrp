import { beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import path from "node:path";
import { loadPyodide } from "pyodide";
import {
  initEngine,
  runWithPyodide,
  splitStdin,
  type PyodideLike,
} from "../src/features/python-editor/engine";

let py: PyodideLike;
beforeAll(async () => {
  const indexURL = path.dirname(
    createRequire(import.meta.url).resolve("pyodide/package.json"),
  );
  py = (await loadPyodide({ indexURL })) as unknown as PyodideLike;
  initEngine(py);
});

const run = (source: string, stdin = "") => runWithPyodide(py, source, stdin);

describe("splitStdin", () => {
  it("maps one line to one input() call", () => {
    expect(splitStdin("")).toEqual([]);
    expect(splitStdin("a")).toEqual(["a"]);
    expect(splitStdin("a\nb")).toEqual(["a", "b"]);
    expect(splitStdin("a\nb\n")).toEqual(["a", "b"]);
    expect(splitStdin("a\r\nb\r\n")).toEqual(["a", "b"]);
    expect(splitStdin("a\n\nb")).toEqual(["a", "", "b"]);
  });
});

describe("python execution", () => {
  it("captures stdout from print", () => {
    const r = run('print("halo")\nprint(1 + 2)');
    expect(r).toMatchObject({
      status: "ok",
      stdout: "halo\n3",
      traceback: null,
      stdinExhausted: false,
    });
  });

  it("flushes output that has no trailing newline", () => {
    expect(run('print("tanpa newline", end="")').stdout).toBe("tanpa newline");
  });

  it("reads a single input()", () => {
    expect(run('nama = input()\nprint("Halo,", nama)', "Budi").stdout).toBe(
      "Halo, Budi",
    );
  });

  it("reads multiple sequential input() calls in order", () => {
    const code =
      'a = input("a? ")\nb = input("b? ")\nc = input()\nprint(a, b, c)';
    expect(run(code, "satu\ndua\ntiga").stdout).toContain("satu dua tiga");
  });

  it("supports int(input()) arithmetic without rewriting the source", () => {
    const code =
      "x = int(input())\ny = int(input())\nprint(x + y)\nprint(x * y)";
    const r = run(code, "6\n7");
    expect(r.status).toBe("ok");
    expect(r.stdout).toBe("13\n42");
  });

  it("supports float conversion and string formatting", () => {
    const code = 'jam = int(input())\nprint(f"Tarif: {jam * 5000}")';
    expect(run(code, "2").stdout).toBe("Tarif: 10000");
  });

  it("reports a clear EOF condition when input() has no more lines", () => {
    const r = run("a = input()\nb = input()\nprint(a, b)", "hanya-satu");
    expect(r.status).toBe("error");
    expect(r.stdinExhausted).toBe(true);
    expect(r.stdinLines).toBe(1);
    expect(r.traceback).toContain("EOFError");
  });

  it("does not hang when input() is called with empty stdin", () => {
    const r = run("input()");
    expect(r.status).toBe("error");
    expect(r.stdinExhausted).toBe(true);
  });

  it("returns a student-facing traceback for runtime errors", () => {
    const r = run('print("sebelum")\nx = 1 / 0\nprint("sesudah")');
    expect(r.status).toBe("error");
    expect(r.stdout).toBe("sebelum");
    expect(r.traceback).toContain("ZeroDivisionError");
    expect(r.traceback).toContain('File "main.py", line 2');
    // Pyodide / harness internals are hidden
    expect(r.traceback).not.toContain("_pyodide");
    expect(r.traceback).not.toContain("__skrp_run");
  });

  it("reports ValueError from bad numeric input", () => {
    const r = run("int(input())", "abc");
    expect(r.status).toBe("error");
    expect(r.traceback).toContain("ValueError");
    expect(r.stdinExhausted).toBe(false);
  });

  it("reports syntax errors with the line number", () => {
    const r = run('print("ok")\nif True print(1)');
    expect(r.status).toBe("error");
    expect(r.traceback).toContain("SyntaxError");
    expect(r.traceback).toContain("line 2");
    expect(r.stdout).toBe("");
  });

  it("captures writes to stderr separately", () => {
    const r = run('import sys\nsys.stderr.write("peringatan\\n")\nprint("ok")');
    expect(r.status).toBe("ok");
    expect(r.stderr).toBe("peringatan");
    expect(r.stdout).toBe("ok");
  });

  it("isolates runs from each other's globals", () => {
    run("rahasia = 123");
    const r = run("print(rahasia)");
    expect(r.status).toBe("error");
    expect(r.traceback).toContain("NameError");
  });

  it("resets stdin between runs", () => {
    expect(run("print(input())", "pertama").stdout).toBe("pertama");
    const second = run("print(input())", "kedua");
    expect(second.stdout).toBe("kedua");
  });

  it("treats sys.exit() as a normal end", () => {
    const r = run('import sys\nprint("a")\nsys.exit(0)\nprint("b")');
    expect(r.status).toBe("ok");
    expect(r.stdout).toBe("a");
  });
});
