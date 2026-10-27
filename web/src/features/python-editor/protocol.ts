import type { EngineOutput } from "./engine";

export type ToWorker =
  | { type: "init"; indexURL: string }
  | { type: "run"; runId: string; source: string; stdin: string };

export type FromWorker =
  | { type: "ready"; version: string }
  | { type: "init-error"; message: string }
  /** Sent right before user code starts, so the timeout excludes runtime download. */
  | { type: "started"; runId: string }
  | ({ type: "result"; runId: string; version: string } & EngineOutput);
