import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "../src/lib/api/types";
import {
  backoffDelay,
  isTransient,
  withRetry,
  DEFAULT_RETRY,
} from "../src/lib/api/retry";
import { liveClient } from "../src/lib/api/live";

const err = (status: number, code = "INTERNAL_ERROR", retryAfterMs?: number) =>
  new ApiClientError(status, code, "x", undefined, retryAfterMs);

/** Instant sleeps that record how long each retry would have waited. */
const fast = () => {
  const delays: number[] = [];
  return {
    delays,
    options: {
      sleep: async (ms: number) => void delays.push(ms),
      random: () => 1, // always the upper end of the jitter range
    },
  };
};

describe("isTransient", () => {
  it("accepts network errors and 408/429/5xx", () => {
    for (const s of [0, 408, 429, 500, 502, 503, 504])
      expect(isTransient(err(s))).toBe(true);
  });

  it("rejects client errors, AI failures and foreign errors", () => {
    for (const s of [400, 401, 403, 404, 409, 422])
      expect(isTransient(err(s))).toBe(false);
    expect(isTransient(err(503, "AI_UNAVAILABLE"))).toBe(false);
    expect(isTransient(err(504, "AI_TIMEOUT"))).toBe(false);
    expect(isTransient(new Error("boom"))).toBe(false);
  });
});

describe("backoffDelay", () => {
  it("grows exponentially up to the cap, with full jitter", () => {
    const base = { baseDelayMs: 300, maxDelayMs: 3000 };
    expect(backoffDelay(0, { ...base, random: () => 1 })).toBe(300);
    expect(backoffDelay(1, { ...base, random: () => 1 })).toBe(600);
    expect(backoffDelay(2, { ...base, random: () => 1 })).toBe(1200);
    expect(backoffDelay(10, { ...base, random: () => 1 })).toBe(3000);
    expect(backoffDelay(2, { ...base, random: () => 0 })).toBe(0);
    expect(backoffDelay(2, { ...base, random: () => 0.5 })).toBe(600);
  });
});

describe("withRetry", () => {
  it("returns the first success without waiting", async () => {
    const { delays, options } = fast();
    const op = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(op, options)).resolves.toBe("ok");
    expect(op).toHaveBeenCalledTimes(1);
    expect(delays).toEqual([]);
  });

  it("retries a transient failure and succeeds", async () => {
    const { delays, options } = fast();
    const op = vi.fn().mockRejectedValueOnce(err(503)).mockResolvedValue("ok");
    await expect(withRetry(op, options)).resolves.toBe("ok");
    expect(op).toHaveBeenCalledTimes(2);
    expect(delays).toEqual([300]);
  });

  it("gives up after the configured retries and throws the last error", async () => {
    const { delays, options } = fast();
    const last = err(502);
    const op = vi
      .fn()
      .mockRejectedValueOnce(err(500))
      .mockRejectedValueOnce(err(503))
      .mockRejectedValue(last);
    await expect(withRetry(op, options)).rejects.toBe(last);
    expect(op).toHaveBeenCalledTimes(DEFAULT_RETRY.retries + 1); // 3 attempts
    expect(delays).toEqual([300, 600]);
  });

  it("does not retry non-transient errors", async () => {
    const { delays, options } = fast();
    const op = vi.fn().mockRejectedValue(err(404, "NOT_FOUND"));
    await expect(withRetry(op, options)).rejects.toMatchObject({ status: 404 });
    expect(op).toHaveBeenCalledTimes(1);
    expect(delays).toEqual([]);
  });

  it("does not retry AI failures", async () => {
    const op = vi.fn().mockRejectedValue(err(503, "AI_UNAVAILABLE"));
    await expect(withRetry(op, fast().options)).rejects.toMatchObject({
      code: "AI_UNAVAILABLE",
    });
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("waits at least Retry-After, and gives up when it asks for too long", async () => {
    const { delays, options } = fast();
    const op = vi
      .fn()
      .mockRejectedValueOnce(err(429, "RATE_LIMITED", 2000))
      .mockResolvedValue("ok");
    await expect(withRetry(op, options)).resolves.toBe("ok");
    expect(delays).toEqual([2000]);

    const slow = vi.fn().mockRejectedValue(err(503, "UNAVAILABLE", 60_000));
    await expect(withRetry(slow, fast().options)).rejects.toMatchObject({
      status: 503,
    });
    expect(slow).toHaveBeenCalledTimes(1);
  });

  it("reports each retry to onRetry", async () => {
    const seen: number[] = [];
    const op = vi.fn().mockRejectedValueOnce(err(0)).mockResolvedValue("ok");
    await withRetry(op, {
      ...fast().options,
      onRetry: ({ attempt }) => seen.push(attempt),
    });
    expect(seen).toEqual([1]);
  });
});

describe("liveClient", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const json = (status: number, body: unknown, headers?: HeadersInit) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...headers },
    });
  const failure = (status: number, code = "INTERNAL_ERROR") =>
    json(status, { error: { code, message: "gagal" } });
  const run = async <T>(promise: Promise<T>) => {
    const settled = promise.then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    await vi.runAllTimersAsync();
    return settled;
  };

  it("retries an idempotent GET after a 503", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(failure(503, "UNAVAILABLE"))
      .mockResolvedValueOnce(json(200, { data: { studentCode: "PY001" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await run(liveClient.getStudent("PY001"));
    expect(result).toEqual({ value: { studentCode: "PY001" } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a network failure, then reports it after 3 attempts", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await run(liveClient.getProgress("PY001"));
    expect(result).toMatchObject({
      error: { status: 0, code: "NETWORK_ERROR" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a 404", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(failure(404, "NOT_FOUND"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await run(liveClient.getStudent("PY999"));
    expect(result).toMatchObject({ error: { status: 404 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reads Retry-After from the response", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        json(
          503,
          { error: { code: "UNAVAILABLE", message: "x" } },
          { "retry-after": "60" },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const result = await run(liveClient.getStudent("PY001"));
    // 60s exceeds the wait limit, so it fails fast instead of retrying.
    expect(result).toMatchObject({
      error: { status: 503, retryAfterMs: 60000 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries the idempotent POSTs (code revision, hint) but not AI evaluation", async () => {
    vi.useFakeTimers();
    const ok = (data: unknown) => json(200, { data });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(failure(503, "UNAVAILABLE"))
      .mockResolvedValueOnce(ok({ revision: {}, created: true }));
    vi.stubGlobal("fetch", fetchMock);
    const revision = await run(
      liveClient.saveCodeRevision("PY001", "case-1", {
        source: "print(1)",
        stdin: "",
      }),
    );
    expect(revision).toHaveProperty("value");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(failure(502, "UNAVAILABLE"))
      .mockResolvedValueOnce(ok({ id: "h1" }));
    const hint = await run(
      liveClient.requestHint("PY001", {
        caseId: "case-1",
        stage: "understand",
        requestId: "r1",
      }),
    );
    expect(hint).toHaveProperty("value");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(failure(503, "UNAVAILABLE"));
    const evaluation = await run(
      liveClient.evaluateStage("PY001", {
        caseId: "case-1",
        stage: "understand",
      } as never),
    );
    expect(evaluation).toHaveProperty("error");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
