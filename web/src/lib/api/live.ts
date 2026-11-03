import type { ApiErrorBody } from "@skrp/shared";
import { withRetry } from "./retry";
import { ApiClientError, type ApiClient } from "./types";

const enc = encodeURIComponent;

/** `Retry-After` is either a number of seconds or an HTTP date. */
function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

/** One HTTP attempt. Failures are thrown as `ApiClientError`. */
async function attempt<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers:
        body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError(
      0,
      "NETWORK_ERROR",
      "Tidak dapat terhubung ke server.",
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // fall through: non-JSON bodies are treated as a generic failure below
  }

  if (!response.ok) {
    const error = (payload as ApiErrorBody | null)?.error;
    throw new ApiClientError(
      response.status,
      error?.code ?? "INTERNAL_ERROR",
      error?.message ?? `Permintaan gagal (${response.status}).`,
      error?.meta,
      parseRetryAfter(response.headers.get("retry-after")),
    );
  }
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new ApiClientError(
      502,
      "INVALID_RESPONSE",
      "Respons server tidak valid.",
    );
  }
  return (payload as { data: T }).data;
}

interface RequestOptions {
  /**
   * Repeat the request after transient failures (see retry.ts). Defaults to true for
   * GET/PUT/DELETE/HEAD, which are idempotent, and false for POST. A POST opts in only when
   * the backend makes repeating it harmless.
   */
  retry?: boolean;
}

const IDEMPOTENT_METHODS = new Set(["GET", "PUT", "DELETE", "HEAD"]);

/** The single entry point for every live API call. */
function request<T>(
  method: string,
  path: string,
  body?: unknown,
  { retry = IDEMPOTENT_METHODS.has(method) }: RequestOptions = {},
): Promise<T> {
  const once = () => attempt<T>(method, path, body);
  return retry ? withRetry(once) : once();
}

/** Talks to the same-origin Next.js BFF (`/api/*`). It never sees the Express origin. */
export const liveClient: ApiClient = {
  mode: "live",
  aiEnabled: true,
  getStudent: (code) => request("GET", `/students/${enc(code)}`),
  getProgress: (code) => request("GET", `/students/${enc(code)}/progress`),
  saveCaseProgress: (code, caseId, input) =>
    request(
      "PUT",
      `/students/${enc(code)}/cases/${enc(caseId)}/progress`,
      input,
    ),
  saveArtifact: (code, caseId, kind, input) =>
    request(
      "PUT",
      `/students/${enc(code)}/cases/${enc(caseId)}/artifacts/${enc(kind.toLowerCase().replace(/_/g, "-"))}`,
      input,
    ),
  saveCodeRevision: (code, caseId, input) =>
    request(
      "POST",
      `/students/${enc(code)}/cases/${enc(caseId)}/code-revisions`,
      input,
      // Safe to repeat: an identical source+stdin as the latest revision writes nothing.
      { retry: true },
    ),
  evaluateStage: (code, input) =>
    request("POST", `/students/${enc(code)}/evaluations/stages`, input),
  getStageEvaluations: (code, caseId, stage) =>
    request(
      "GET",
      `/students/${enc(code)}/evaluations/stages?caseId=${enc(caseId)}&stage=${enc(stage)}`,
    ),
  requestHint: (code, input) =>
    // Safe to repeat: the backend returns the original interaction for the same requestId.
    request("POST", `/students/${enc(code)}/assistance/hint`, input, {
      retry: true,
    }),
  getAssistanceHistory: (code, caseId, stage) =>
    request(
      "GET",
      `/students/${enc(code)}/assistance/history?caseId=${enc(caseId)}&stage=${enc(stage)}`,
    ),
  evaluateCase: (code, caseId) =>
    request("POST", `/students/${enc(code)}/evaluations/cases`, { caseId }),
};
