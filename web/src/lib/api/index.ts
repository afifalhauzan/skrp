import { liveClient } from "./live";
import { mockClient } from "./mock";
import type { ApiClient, ApiMode } from "./types";

export { ApiClientError } from "./types";
export type { ApiClient, ApiMode } from "./types";
export { resetMockData } from "./mock";

/**
 * The single place the mode is decided. `NEXT_PUBLIC_API_MODE` must be "mock" or "live".
 * When unset: production builds use the live API; development uses mock data so the
 * UI works without a backend. A failed live request is never replaced by mock data.
 */
export function resolveApiMode(
  value = process.env.NEXT_PUBLIC_API_MODE,
): ApiMode {
  if (value === "mock" || value === "live") return value;
  return process.env.NODE_ENV === "production" ? "live" : "mock";
}

export function getApiClient(): ApiClient {
  return resolveApiMode() === "mock" ? mockClient : liveClient;
}
