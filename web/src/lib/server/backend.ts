import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { ApiErrorBody, ApiErrorCode } from "@skrp/shared";

/**
 * Server-only helpers for the BFF route handlers. The backend origin and the
 * internal key come from server environment variables and never reach the client.
 */

const TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 256 * 1024;

const STUDENT_CODE = /^(PY\d{3,}|VALIDATOR\d{3})$/i;
const CASE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const ARTIFACT_KINDS = new Set([
  "problem-spec",
  "pseudocode",
  "flowchart",
  "reflection",
]);

export const patterns = { STUDENT_CODE, CASE_ID };

export function isArtifactKind(value: string) {
  return ARTIFACT_KINDS.has(value);
}

function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  requestId?: string,
) {
  const body: ApiErrorBody = {
    error: { code, message, ...(requestId ? { requestId } : {}) },
  };
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export const badParam = (what: string) =>
  errorResponse(400, "VALIDATION_ERROR", `Invalid ${what}`);

function backendOrigin() {
  return (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(
    /\/+$/,
    "",
  );
}

interface ForwardOptions {
  method: "GET" | "PUT" | "POST";
  /** Fixed path built by a route handler from validated segments, e.g. `/api/students/PY001`. */
  path: string;
  request: Request;
}

/**
 * Forwards one explicitly-defined call to Express and normalises the result:
 * upstream 2xx/4xx pass through with their status; 5xx and network failures are
 * replaced by a generic error so internals never leak.
 */
export async function forward({
  method,
  path,
  request,
}: ForwardOptions): Promise<NextResponse> {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();

  let body: string | undefined;
  if (method !== "GET") {
    body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
      return errorResponse(
        413,
        "PAYLOAD_TOO_LARGE",
        "Request body is too large",
        requestId,
      );
    }
  }

  const headers: Record<string, string> = {
    accept: "application/json",
    "x-request-id": requestId,
  };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (process.env.INTERNAL_API_KEY)
    headers["x-internal-key"] = process.env.INTERNAL_API_KEY;

  // Abort on either the browser disconnecting or our own timeout.
  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(TIMEOUT_MS),
  ]);

  let upstream: Response;
  try {
    upstream = await fetch(`${backendOrigin()}${path}`, {
      method,
      headers,
      body,
      signal,
      cache: "no-store",
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    if (!request.signal.aborted) {
      console.error(
        `[bff] ${method} ${path} failed (${requestId}):`,
        (error as Error)?.name,
      );
    }
    return timedOut
      ? errorResponse(
          504,
          "UPSTREAM_TIMEOUT",
          "The server took too long to respond",
          requestId,
        )
      : errorResponse(
          502,
          "UPSTREAM_UNAVAILABLE",
          "The server is unavailable",
          requestId,
        );
  }

  let payload: unknown = null;
  try {
    payload = await upstream.json();
  } catch {
    // handled below
  }

  // Learner endpoints never legitimately answer 401/403 to the BFF: that means the shared
  // internal key is wrong or missing. Report it as a server fault, not as the learner's.
  if (upstream.status === 401 || upstream.status === 403) {
    console.error(
      `[bff] ${method} ${path} rejected by API (${upstream.status}); check INTERNAL_API_KEY`,
    );
    return errorResponse(
      502,
      "UPSTREAM_UNAVAILABLE",
      "The server is unavailable",
      requestId,
    );
  }

  if (upstream.status >= 500 || (upstream.ok && payload === null)) {
    console.error(
      `[bff] ${method} ${path} upstream ${upstream.status} (${requestId})`,
    );
    return errorResponse(
      upstream.status >= 500 ? upstream.status : 502,
      upstream.status === 503 ? "UPSTREAM_UNAVAILABLE" : "INTERNAL_ERROR",
      "The server could not complete the request",
      requestId,
    );
  }
  if (payload === null) {
    return errorResponse(
      upstream.status,
      "INTERNAL_ERROR",
      "Unexpected response",
      requestId,
    );
  }

  return NextResponse.json(payload, {
    status: upstream.status,
    headers: { "cache-control": "no-store", "x-request-id": requestId },
  });
}
