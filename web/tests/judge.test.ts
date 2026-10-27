import { beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import path from "node:path";
import { loadPyodide } from "pyodide";
import {
  initEngine,
  runWithPyodide,
  type PyodideLike,
} from "../src/features/python-editor/engine";
import { judge, lastOutputLine } from "../src/features/python-editor/judge";
import type { ExecutionResult } from "../src/features/python-editor/types";
import { cases } from "../src/lib/mock-data";

const result = (over: Partial<ExecutionResult>): ExecutionResult => ({
  status: "ok",
  stdinExhausted: false,
  durationMs: 1,
  stdout: "",
  stderr: "",
  traceback: null,
  executedAt: "",
  runtime: "pyodide",
  runtimeVersion: null,
  runId: "r",
  source: "",
  stdin: "",
  stdinLines: 0,
  ...over,
});

describe("judge", () => {
  it("reads the last non-empty line", () => {
    expect(lastOutputLine("a\n\nb  \n\n")).toBe("b");
    expect(lastOutputLine("")).toBe("");
  });

  it("passes on an exact match, also after an inline input() prompt", () => {
    expect(judge(result({ stdout: "Tarif: 8000" }), "Tarif: 8000").status).toBe(
      "pass",
    );
    expect(
      judge(result({ stdout: "Jenis: Lama: Tarif: 8000" }), "Tarif: 8000")
        .status,
    ).toBe("pass");
  });

  it("fails on a different number, extra text or empty output", () => {
    expect(
      judge(result({ stdout: "Tarif: 18000" }), "Tarif: 8000").status,
    ).toBe("fail");
    expect(
      judge(result({ stdout: "Tarif: 8000 rupiah" }), "Tarif: 8000").status,
    ).toBe("fail");
    expect(judge(result({ stdout: "" }), "Tarif: 8000").message).toMatch(
      /tidak mencetak/,
    );
  });

  it("reports errors, timeouts, missing runtime and exhausted stdin", () => {
    const err = judge(
      result({
        status: "error",
        traceback:
          'Traceback...\n  File "main.py", line 1\nZeroDivisionError: division by zero',
      }),
      "x",
    );
    expect(err).toMatchObject({
      status: "error",
      message: "ZeroDivisionError: division by zero",
    });
    expect(judge(result({ status: "timeout" }), "x").status).toBe("timeout");
    expect(judge(result({ status: "unavailable" }), "x").status).toBe(
      "unavailable",
    );
    expect(
      judge(result({ stdinExhausted: true, stdout: "x" }), "x").status,
    ).toBe("fail");
  });
});

// Reference solutions prove that every case's rules and test cases agree with each other.
const solutions: Record<string, string> = {
  "case-1": `jenis = input("Jenis: ")
jam = int(input("Jam: "))
if jenis == "mobil":
    tarif = 5000 + (jam - 1) * 3000
    batas = 20000
else:
    tarif = 2000 + (jam - 1) * 1000
    batas = 10000
if tarif > batas:
    tarif = batas
print(f"Tarif: {tarif}")`,
  "case-2": `hari = int(input("Hari: "))
if hari <= 3:
    denda = hari * 1000
else:
    denda = 3000 + (hari - 3) * 2000
if denda > 20000:
    denda = 20000
print(f"Denda: {denda}")`,
  "case-3": `data = [float(x) for x in input().split()]
print(f"Rata-rata: {sum(data) / len(data):.1f}")`,
};

describe("case test fixtures", () => {
  let py: PyodideLike;
  beforeAll(async () => {
    const indexURL = path.dirname(
      createRequire(import.meta.url).resolve("pyodide/package.json"),
    );
    py = (await loadPyodide({ indexURL })) as unknown as PyodideLike;
    initEngine(py);
  });

  for (const item of cases) {
    it(`${item.id}: the reference solution passes every test`, () => {
      for (const t of item.tests) {
        const out = runWithPyodide(py, solutions[item.id], t.stdin);
        const outcome = judge(
          result({ ...out, status: out.status === "ok" ? "ok" : "error" }),
          t.expected,
        );
        expect({
          test: t.id,
          status: outcome.status,
          actual: outcome.actual,
        }).toEqual({
          test: t.id,
          status: "pass",
          actual: t.expected,
        });
      }
    });

    it(`${item.id}: the starter draft does not already pass`, async () => {
      const { codeDrafts } = await import("../src/lib/mock-data");
      const passing = item.tests.filter((t) => {
        const out = runWithPyodide(py, codeDrafts[item.id], t.stdin);
        return (
          judge(
            result({ ...out, status: out.status === "ok" ? "ok" : "error" }),
            t.expected,
          ).status === "pass"
        );
      });
      expect(passing.length).toBeLessThan(item.tests.length);
    });
  }
});
