import type { ApiErrorCode } from "@skrp/shared";

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: { path: string; message: string }[],
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
