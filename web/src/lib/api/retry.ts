import { ApiClientError } from "./types";

/**
 * Retry policy for the frontend API layer. It follows the usual convention
 * (AWS SDK, Google Cloud, Stripe, axios-retry):
 *  - retry only transient failures: network errors and 408/429/500/502/503/504;
 *  - never retry client errors (4xx) or AI-provider failures (`AI_*`), which the UI
 *    surfaces with its own "Coba lagi" action;
 *  - exponential backoff with full jitter, capped, so many clients do not retry in lockstep;
 *  - honour `Retry-After` when the server sends it, and give up if it asks for too long;
 *  - only for idempotent requests (see live.ts), because a retry may repeat a request that
 *    already reached the server.
 * Defaults: 2 retries (3 attempts in total).
 */
export interface RetryOptions {
  /** Retries after the first attempt. */
  retries: number;
  /** Backoff base; the delay ceiling for retry n is `baseDelayMs * 2^n`. */
  baseDelayMs: number;
  /** Upper bound for a single backoff delay. */
  maxDelayMs: number;
  /** A `Retry-After` longer than this is not waited for: the error is thrown instead. */
  maxRetryAfterMs: number;
  /** Injectable for tests. */
  sleep: (ms: number) => Promise<void>;
  random: () => number;
  onRetry?: (info: {
    attempt: number;
    delayMs: number;
    error: unknown;
  }) => void;
}

export const DEFAULT_RETRY: RetryOptions = {
  retries: 2,
  baseDelayMs: 300,
  maxDelayMs: 3000,
  maxRetryAfterMs: 5000,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random: Math.random,
};

const TRANSIENT_STATUS = new Set([0, 408, 429, 500, 502, 503, 504]);

/** True for failures that a repeat of the same request can plausibly fix. */
export function isTransient(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    TRANSIENT_STATUS.has(error.status) &&
    !error.isAiFailure
  );
}

/** Full-jitter exponential backoff: a random delay in [0, min(max, base * 2^retry)]. */
export function backoffDelay(
  retry: number,
  options: Pick<RetryOptions, "baseDelayMs" | "maxDelayMs" | "random">,
): number {
  const ceiling = Math.min(
    options.maxDelayMs,
    options.baseDelayMs * 2 ** retry,
  );
  return Math.round(options.random() * ceiling);
}

/**
 * Runs `operation`, repeating it after transient failures. The last error is thrown
 * unchanged, so callers keep handling `ApiClientError` exactly as before.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  overrides: Partial<RetryOptions> = {},
): Promise<T> {
  const options = { ...DEFAULT_RETRY, ...overrides };
  for (let retry = 0; ; retry++) {
    try {
      return await operation();
    } catch (error) {
      if (retry >= options.retries || !isTransient(error)) throw error;
      const retryAfter = (error as ApiClientError).retryAfterMs;
      if (retryAfter !== undefined && retryAfter > options.maxRetryAfterMs)
        throw error;
      const delayMs = Math.max(retryAfter ?? 0, backoffDelay(retry, options));
      options.onRetry?.({ attempt: retry + 1, delayMs, error });
      await options.sleep(delayMs);
    }
  }
}
