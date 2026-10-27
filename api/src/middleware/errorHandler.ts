import type { ErrorRequestHandler, RequestHandler } from "express";
import type { ApiErrorBody } from "@skrp/shared";
import { ZodError } from "zod";
import { Prisma } from "../lib/prisma";
import { AppError, notFound } from "../lib/errors";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound("Route not found"));
};

function bodyOf(
  code: ApiErrorBody["error"]["code"],
  message: string,
  requestId: unknown,
  details?: ApiErrorBody["error"]["details"],
): ApiErrorBody {
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(typeof requestId === "string" ? { requestId } : {}),
    },
  };
}

/** Centralised error mapping. Unexpected errors are logged, never echoed to clients. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.id;

  if (err instanceof AppError) {
    res
      .status(err.status)
      .json(bodyOf(err.code, err.message, requestId, err.details));
    return;
  }
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    res
      .status(400)
      .json(
        bodyOf(
          "VALIDATION_ERROR",
          "Request validation failed",
          requestId,
          details,
        ),
      );
    return;
  }
  // body-parser errors
  const type = (err as { type?: string })?.type;
  if (type === "entity.too.large") {
    res
      .status(413)
      .json(
        bodyOf("PAYLOAD_TOO_LARGE", "Request body is too large", requestId),
      );
    return;
  }
  if (type === "entity.parse.failed") {
    res
      .status(400)
      .json(bodyOf("VALIDATION_ERROR", "Malformed JSON body", requestId));
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res
        .status(409)
        .json(bodyOf("CONFLICT", "Resource already exists", requestId));
      return;
    }
    if (err.code === "P2025") {
      res
        .status(404)
        .json(bodyOf("NOT_FOUND", "Resource not found", requestId));
      return;
    }
  }

  req.log?.error({ err }, "unhandled error");
  res
    .status(500)
    .json(bodyOf("INTERNAL_ERROR", "Internal server error", requestId));
};
