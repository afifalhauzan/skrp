import type {
  Artifact,
  ArtifactKind,
  CaseProgress,
  ProgressSnapshot,
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
}

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }

  get isNotFound() {
    return this.status === 404;
  }

  /** Worth offering a "Coba lagi" button: network problems and 5xx. */
  get isRetryable() {
    return this.status === 0 || this.status >= 500 || this.status === 429;
  }
}
