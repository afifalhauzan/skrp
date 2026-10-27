import type {
  Artifact,
  ArtifactKind,
  CaseProgress,
  AssistanceHistory,
  AssistanceInteraction,
  CaseEvaluation,
  HintRequestInput,
  ProgressSnapshot,
  RoutingDecision,
  StageEvaluation,
  StageId,
  SubmitStageEvaluationInput,
  SaveArtifactInput,
  SaveCaseProgressInput,
  SaveCodeRevisionInput,
  SaveCodeRevisionResult,
  StudentProfile,
} from "@skrp/shared";

export type ApiMode = "mock" | "live";

/**
 * Everything the UI needs from the backend. Two implementations exist:
 * `liveClient` (same-origin BFF -> Express) and `mockClient` (browser-only fixtures).
 * Components depend on this interface and never branch on the mode themselves.
 */
export interface ApiClient {
  readonly mode: ApiMode;
  /** True when this client can call the AI evaluation / assistance backend. */
  readonly aiEnabled: boolean;
  getStudent(studentCode: string): Promise<StudentProfile>;
  getProgress(studentCode: string): Promise<ProgressSnapshot>;
  saveCaseProgress(
    studentCode: string,
    caseId: string,
    input: SaveCaseProgressInput,
  ): Promise<CaseProgress>;
  saveArtifact(
    studentCode: string,
    caseId: string,
    kind: ArtifactKind,
    input: SaveArtifactInput,
  ): Promise<Artifact>;
  saveCodeRevision(
    studentCode: string,
    caseId: string,
    input: SaveCodeRevisionInput,
  ): Promise<SaveCodeRevisionResult>;
  /** Explicit submission of the current stage's work for AI evaluation. */
  evaluateStage(
    studentCode: string,
    input: SubmitStageEvaluationInput,
  ): Promise<{ evaluation: StageEvaluation; created: boolean }>;
  requestHint(
    studentCode: string,
    input: HintRequestInput,
  ): Promise<{ interaction: AssistanceInteraction; created: boolean }>;
  getAssistanceHistory(
    studentCode: string,
    caseId: string,
    stage: StageId,
  ): Promise<AssistanceHistory>;
  evaluateCase(
    studentCode: string,
    caseId: string,
  ): Promise<{ caseEvaluation: CaseEvaluation; routing: RoutingDecision }>;
}

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** Safe identifiers from the server (e.g. the failed evaluation's id). */
    readonly meta?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }

  get isNotFound() {
    return this.status === 404;
  }

  /** The AI provider (not the student's work) is the problem; the work is kept. */
  get isAiFailure() {
    return this.code.startsWith("AI_");
  }

  /** Worth offering a "Coba lagi" button: network problems and 5xx. */
  get isRetryable() {
    return this.status === 0 || this.status >= 500 || this.status === 429;
  }
}
