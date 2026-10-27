import type { ExecutionResult } from "./types";

export type TestStatus = "pass" | "fail" | "error" | "timeout" | "unavailable";

export interface TestOutcome {
  status: TestStatus;
  /** What the student's program printed last (empty when it printed nothing). */
  actual: string;
  /** Explanation for anything other than a pass. */
  message?: string;
  durationMs: number;
}

/** The last non-empty output line: input() prompts may share earlier lines. */
export function lastOutputLine(stdout: string): string {
  const lines = stdout
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== "");
  return lines[lines.length - 1] ?? "";
}

/**
 * Drops an input() prompt that shares the line with the answer, by cutting at the
 * last occurrence of the expected label ("Tarif:" in "Tarif: 8000").
 */
function trimPrompt(line: string, expected: string): string {
  const colon = expected.indexOf(":");
  if (colon <= 0) return line;
  const label = expected.slice(0, colon + 1);
  const at = line.lastIndexOf(label);
  return at > 0 ? line.slice(at) : line;
}

/** First line of the exception message, e.g. "ZeroDivisionError: division by zero". */
function errorSummary(result: ExecutionResult): string {
  const lines = (result.traceback ?? "").trim().split("\n");
  return lines[lines.length - 1] || "Program berhenti karena error.";
}

/**
 * Compares one run with the expected output. The last output line must equal
 * `expected`, or end with it (an input() prompt printed without a newline sits
 * in front of the answer on the same line).
 */
export function judge(result: ExecutionResult, expected: string): TestOutcome {
  const actual = trimPrompt(lastOutputLine(result.stdout), expected);
  const base = { actual, durationMs: result.durationMs };
  if (result.status === "unavailable")
    return {
      ...base,
      status: "unavailable",
      message:
        "Runtime Python tidak bisa dimuat. Periksa koneksi lalu coba lagi.",
    };
  if (result.status === "timeout")
    return {
      ...base,
      status: "timeout",
      message:
        "Program berjalan terlalu lama. Periksa perulangan yang tidak berhenti.",
    };
  if (result.status === "error")
    return { ...base, status: "error", message: errorSummary(result) };
  if (result.stdinExhausted)
    return {
      ...base,
      status: "fail",
      message: "Program meminta input lebih banyak dari yang disediakan.",
    };
  if (actual === expected || (expected !== "" && actual.endsWith(expected)))
    return { ...base, status: "pass" };
  return {
    ...base,
    status: "fail",
    message: actual === "" ? "Program tidak mencetak apa pun." : undefined,
  };
}
