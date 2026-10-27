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
  | "RATE_LIMITED"
  | "STALE_ARTIFACT"
  | "INVALID_STATE"
  | "AI_NOT_CONFIGURED"
  | "AI_TIMEOUT"
  | "AI_RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "AI_INVALID_RESPONSE"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field-level validation details. Never contains internals or secrets. */
    details?: { path: string; message: string }[];
    requestId?: string;
    /** Safe, non-sensitive identifiers (e.g. the failed evaluation's id) to support a retry. */
    meta?: Record<string, string>;
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
export type CaseStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  /** Bypassed by the routing policy. Never counts as completed. */
  | "SKIPPED";
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
  /** Latest stage evaluation per case + stage (history is available per stage). */
  stageEvaluations: StageEvaluation[];
  /** Latest routing decision per case. */
  routing: RoutingDecision[];
}

// ---------------------------------------------------------------------------
// AI evaluation, assistance and routing (provisional policies, see api/docs)
// ---------------------------------------------------------------------------

export type SupportLevel = "HIGH" | "MODERATE" | "LOW";
export type EvaluationStatus = "PENDING" | "COMPLETED" | "FAILED";
export type AssistanceLevel = "L1" | "L2" | "L3" | "L4" | "L5";

export interface CriterionScore {
  key: string;
  label: string;
  /** Integer 0..maxScore. */
  score: number;
  maxScore: number;
  /** Evidence from the student's work supporting the score. */
  evidence: string;
}

/** Test outcomes reported by the browser; stored as unverified evidence only. */
export interface ClientTestResult {
  testId: string;
  passed: boolean;
  actual?: string;
}

export interface SubmitStageEvaluationInput {
  caseId: string;
  stage: StageId;
  /** If set and not the latest code revision, the submission is rejected as stale. */
  codeRevision?: number;
  testResults?: ClientTestResult[];
}

export interface StageEvaluation {
  id: string;
  caseId: string;
  stage: StageId;
  status: EvaluationStatus;
  attempt: number;
  rubricVersion: string;
  /** Exact artifact revisions that were assessed. */
  artifactRevisionIds: string[];
  codeRevision: number | null;
  /** Identifies the exact submitted content; equal hashes mean "same work". */
  submissionHash: string;
  criteria: CriterionScore[];
  totalScore: number | null;
  maxScore: number;
  wentWell: string[];
  needsImprovement: string[];
  feedback: string | null;
  uncertainty: { insufficientEvidence: boolean; notes: string | null } | null;
  /** The application's completion policy applied to this evaluation (not the model's opinion). */
  completion: { policyVersion: string; satisfied: boolean; reason: string };
  /** False once the student edits the work after this evaluation (it stays as history). */
  isCurrent: boolean;
  failure: { category: string; message: string } | null;
  createdAt: string;
  completedAt: string | null;
}

export interface HintRequestInput {
  caseId: string;
  stage: StageId;
  /** Client-generated UUID; repeating it returns the original interaction. */
  requestId: string;
}

export interface AssistanceInteraction {
  id: string;
  caseId: string;
  stage: StageId;
  /** Chosen by the backend policy, never by the model. */
  level: AssistanceLevel;
  policyVersion: string;
  trigger: "HINT_REQUEST";
  /** GENERATED = written by the model; FALLBACK = static text because the model failed. */
  status: "GENERATED" | "FALLBACK";
  assistanceType: string;
  content: string;
  failureCategory: string | null;
  createdAt: string;
}

export interface AssistanceHistory {
  caseId: string;
  stage: StageId;
  interactions: AssistanceInteraction[];
  /** Level the next hint request would receive. */
  nextLevel: AssistanceLevel;
  maxLevel: AssistanceLevel;
  policyVersion: string;
}

export interface CaseEvaluation {
  id: string;
  caseId: string;
  status: "COMPLETED" | "INSUFFICIENT_EVIDENCE";
  policyVersion: string;
  summary: {
    stages: {
      stage: StageId;
      evaluationId: string | null;
      totalScore: number | null;
      maxScore: number;
    }[];
    totalScore: number;
    maxScore: number;
    /** Score as a share of the maximum. A descriptive number, not a competence verdict. */
    scoreRatio: number;
    strengths: string[];
    improvements: string[];
    missingStages: StageId[];
  };
  stageEvaluationIds: string[];
  createdAt: string;
}

export type RoutingStatus =
  | "ADVANCE"
  | "ADVANCE_WITH_SKIP"
  | "HOLD_INSUFFICIENT_EVIDENCE"
  | "JOURNEY_COMPLETE";

export interface RoutingDecision {
  id: string;
  currentCaseId: string;
  nextCaseId: string | null;
  skippedCaseIds: string[];
  status: RoutingStatus;
  reason: string;
  caseEvaluationId: string;
  policyVersion: string;
  /** Always true: thresholds behind this decision are unvalidated. */
  provisional: boolean;
  createdAt: string;
}

export interface CaseConfigSummary {
  id: string;
  number: number;
  support: SupportLevel;
  title: string;
}
