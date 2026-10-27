import type { ApiErrorCode } from "@skrp/shared";

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: { path: string; message: string }[],
    readonly meta?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (message = "Resource not found") =>
  new AppError(404, "NOT_FOUND", message);
export const conflict = (message: string) =>
  new AppError(409, "CONFLICT", message);
export const badRequest = (message: string, details?: AppError["details"]) =>
  new AppError(400, "VALIDATION_ERROR", message, details);
export const unauthorized = (message = "Missing or invalid credentials") =>
  new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "Not allowed") =>
  new AppError(403, "FORBIDDEN", message);
export const rateLimited = (message: string) =>
  new AppError(429, "RATE_LIMITED", message);
export const invalidState = (message: string) =>
  new AppError(409, "INVALID_STATE", message);
export const staleArtifact = (message: string) =>
  new AppError(409, "STALE_ARTIFACT", message);

const AI_STATUS = {
  NOT_CONFIGURED: [503, "AI_NOT_CONFIGURED"],
  TIMEOUT: [504, "AI_TIMEOUT"],
  RATE_LIMITED: [503, "AI_RATE_LIMITED"],
  UNAVAILABLE: [503, "AI_UNAVAILABLE"],
  INVALID_RESPONSE: [502, "AI_INVALID_RESPONSE"],
} as const;

/** Maps an AI failure category to a client-safe error. `meta` may carry the failed record's id. */
export const aiFailure = (
  category: keyof typeof AI_STATUS,
  message: string,
  meta?: Record<string, string>,
) =>
  new AppError(
    AI_STATUS[category][0],
    AI_STATUS[category][1],
    message,
    undefined,
    meta,
  );
