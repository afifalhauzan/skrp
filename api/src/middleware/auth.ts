import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { forbidden, unauthorized } from "../lib/errors";

function matches(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Service-to-service guard: the Next.js BFF sends `x-internal-key`. When no key is
 * configured (local development only; production config requires one) the guard is open.
 *
 * This is NOT student authentication. A student code identifies a record, it is not a credential.
 */
export function requireInternalKey(
  expected: string | undefined,
): RequestHandler {
  return (req, _res, next) => {
    if (!expected) return next();
    return matches(req.header("x-internal-key"), expected)
      ? next()
      : next(unauthorized());
  };
}

/** Guards roster administration. Disabled entirely unless ADMIN_API_KEY is configured. */
export function requireAdminKey(expected: string | undefined): RequestHandler {
  return (req, _res, next) => {
    if (!expected)
      return next(forbidden("Administrative endpoints are disabled"));
    return matches(req.header("x-admin-key"), expected)
      ? next()
      : next(unauthorized());
  };
}
