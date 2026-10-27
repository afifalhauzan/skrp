/**
 * API contracts shared by `web` (client + BFF) and `api` (Express).
 *
 * Type-only on purpose: runtime validation lives in `api/src/validators`
 * (zod), and importing this package never pulls code into a bundle.
 */

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  data: T;
}

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "PAYLOAD_TOO_LARGE"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_TIMEOUT"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field-level validation details. Never contains internals or secrets. */
    details?: { path: string; message: string }[];
    requestId?: string;
  };
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

/** What the learner-facing UI may see. `name` is null until the roster is supplied. */
export interface StudentProfile {
  studentCode: string;
  name: string | null;
  className: string | null;
}

/** Administrative view of a student record. */
export interface StudentRecord extends StudentProfile {
  id: string;
  /** Null for special accounts (e.g. VALIDATOR001). */
  attendanceNumber: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentInput {
  attendanceNumber: number;
  name?: string | null;
  className?: string | null;
}

export interface UpdateStudentInput {
  name?: string | null;
  className?: string | null;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Learning domain
// ---------------------------------------------------------------------------

export type StageId = "understand" | "design" | "implement" | "test";
export type CaseStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type ArtifactKind =
  | "PROBLEM_SPEC"
  | "PSEUDOCODE"
  | "FLOWCHART"
  | "REFLECTION";

export type FlowNodeKind = "start" | "end" | "process" | "io" | "decision";
export interface FlowNode {
  id: string;
  kind: FlowNodeKind;
  label: string;
  x: number;
  y: number;
  /** "ai" = draft supplied by BE/AI; becomes "student" once the student edits it. */
  origin: "ai" | "student";
}
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}
/** A student's flowchart. Stored as a JSON string in the FLOWCHART artifact's `content`. */
export interface Flowchart {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface ProblemSpec {
  goal: string;
  input: string;
  process: string;
  output: string;
  constraints: string;
}

/** Student-to-case progress. */
export interface CaseProgress {
  caseId: string;
  status: CaseStatus;
  currentStage: StageId;
  completedStages: StageId[];
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface SaveCaseProgressInput {
  currentStage: StageId;
  completedStages: StageId[];
}

/** Saved work other than code. `content` is a ProblemSpec or a plain string by kind (FLOWCHART: JSON-encoded Flowchart). */
export interface Artifact {
  caseId: string;
  kind: ArtifactKind;
  content: ProblemSpec | string;
  updatedAt: string;
}

export interface SaveArtifactInput {
  content: ProblemSpec | string;
}

// ---------------------------------------------------------------------------
// Code + execution
// ---------------------------------------------------------------------------

export type ExecutionStatus = "ok" | "error" | "timeout" | "unavailable";

/**
 * Metadata about one Pyodide run. It is produced in the learner's browser, so it
 * is client-reported data, not verified assessment evidence.
 */
export interface ExecutionMetadata {
  status: ExecutionStatus;
  /** True when the program asked for more input lines than were supplied. */
  stdinExhausted: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  traceback: string | null;
  executedAt: string;
  runtime: "pyodide";
  runtimeVersion: string | null;
}

export interface CodeRevision {
  caseId: string;
  revision: number;
  source: string;
  stdin: string;
  /** Run metadata for exactly this `source` + `stdin`, if the learner ran it. */
  execution: ExecutionMetadata | null;
  createdAt: string;
}

export interface SaveCodeRevisionInput {
  source: string;
  stdin: string;
  execution?: ExecutionMetadata | null;
}

export interface SaveCodeRevisionResult {
  revision: CodeRevision;
  /** False when the payload equalled the latest revision and nothing was written. */
  created: boolean;
}

// ---------------------------------------------------------------------------
// Snapshot used to resume a student's work
// ---------------------------------------------------------------------------

export interface ProgressSnapshot {
  student: StudentProfile;
  cases: CaseProgress[];
  artifacts: Artifact[];
  /** Latest code revision per case. */
  latestCode: CodeRevision[];
}
