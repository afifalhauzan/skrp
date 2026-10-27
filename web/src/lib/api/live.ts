import type { ApiErrorBody } from "@skrp/shared";
import { ApiClientError, type ApiClient } from "./types";

const enc = encodeURIComponent;

async function request<T>(
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

/** Talks to the same-origin Next.js BFF (`/api/*`). It never sees the Express origin. */
export const liveClient: ApiClient = {
  mode: "live",
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
    ),
};
