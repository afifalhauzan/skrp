import type { ExecutionMetadata } from "@skrp/shared";

/** One Pyodide run, tied to the exact source and stdin that produced it. */
export interface ExecutionResult extends ExecutionMetadata {
  runId: string;
  /** Snapshot of the editor contents at run time. */
  source: string;
  stdin: string;
  /** How many stdin lines were supplied (used for the "not enough input" message). */
  stdinLines: number;
}

/** What a test case will provide in a later iteration: just an input string. */
export interface RunRequest {
  source: string;
  stdin: string;
  timeoutMs?: number;
}

export interface PythonRunner {
  run(request: RunRequest): Promise<ExecutionResult>;
  /** Aborts the run in progress (terminates the worker). */
  stop(): void;
  dispose(): void;
}

/** True when `result` was produced by exactly this code and input. */
export function isResultCurrent(
  result: ExecutionResult | undefined,
  source: string,
  stdin: string,
) {
  return !!result && result.source === source && result.stdin === stdin;
}

export function toMetadata(result: ExecutionResult): ExecutionMetadata {
  return {
    status: result.status,
    stdinExhausted: result.stdinExhausted,
    durationMs: result.durationMs,
    stdout: result.stdout,
    stderr: result.stderr,
    traceback: result.traceback,
    executedAt: result.executedAt,
    runtime: result.runtime,
    runtimeVersion: result.runtimeVersion,
  };
}
