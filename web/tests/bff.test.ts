import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forward } from "../src/lib/server/backend";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function call(method: "GET" | "PUT" | "POST" = "GET", body?: string) {
  const request = new Request("http://localhost/api/x", { method, body });
  return forward({ method, path: "/api/students/PY001", request });
}

beforeEach(() => {
  vi.stubEnv("API_INTERNAL_URL", "http://api.internal:4000/");
  vi.stubEnv("INTERNAL_API_KEY", "secret-internal-key-123");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("BFF forward()", () => {
  it("calls the configured origin with the internal key and passes a 200 through", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { studentCode: "PY001" } }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { studentCode: "PY001" } });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://api.internal:4000/api/students/PY001");
    expect(init.headers["x-internal-key"]).toBe("secret-internal-key-123");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("preserves 4xx statuses and bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { error: { code: "NOT_FOUND", message: "Student not found" } },
            404,
          ),
        ),
    );
    const res = await call();
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("keeps the 5xx status but never forwards upstream internals", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "INTERNAL_ERROR",
              message: "at /srv/app/db.ts:12 password=hunter2",
            },
          },
          500,
        ),
      ),
    );
    const res = await call();
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("/srv/app");
  });

  it("reports an unreachable API as 502 without leaking the error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(new TypeError("connect ECONNREFUSED 10.0.0.5:4000")),
    );
    const res = await call();
    expect(res.status).toBe(502);
    const text = JSON.stringify(await res.json());
    expect(text).toContain("UPSTREAM_UNAVAILABLE");
    expect(text).not.toContain("10.0.0.5");
  });

  it("maps a timeout to 504", async () => {
    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));
    expect((await call()).status).toBe(504);
  });

  it("treats an upstream 401 (bad internal key) as a server fault, not a learner error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ error: { code: "UNAUTHORIZED" } }, 401),
        ),
    );
    expect((await call()).status).toBe(502);
  });

  it("rejects oversized request bodies before contacting the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await call(
      "PUT",
      JSON.stringify({ content: "x".repeat(300 * 1024) }),
    );
    expect(res.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards JSON bodies on writes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    await call("PUT", JSON.stringify({ a: 1 }));
    const init = fetchMock.mock.calls[0]![1];
    expect(init.method).toBe("PUT");
    expect(init.body).toBe('{"a":1}');
    expect(init.headers["content-type"]).toBe("application/json");
  });

  it("passes our own AI error codes through on 5xx, with only safe fields", async () => {
    const evaluationId = "2f1b6c7e-9a40-4a6e-8d2b-0c5d7a1e3f90";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "AI_TIMEOUT",
              message: "Layanan AI terlalu lama merespons.",
              meta: { evaluationId, secret: "AIzaSyLEAK" },
              stack: "at /srv/app/x.ts",
            },
          },
          504,
        ),
      ),
    );
    const res = await call();
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.error).toMatchObject({
      code: "AI_TIMEOUT",
      meta: { evaluationId },
    });
    expect(JSON.stringify(body)).not.toMatch(/AIza|\/srv\/app/);
  });

  it("does not pass through arbitrary 5xx error codes or malformed evaluation ids", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "DB_PASSWORD_WRONG",
              message: "password=hunter2",
              meta: { evaluationId: "not-a-uuid" },
            },
          },
          500,
        ),
      ),
    );
    const body = await (await call()).json();
    expect(JSON.stringify(body)).not.toMatch(/hunter2|DB_PASSWORD/);
    expect(body.error.meta).toBeUndefined();
  });

  it("uses the longer AI timeout and appends only the validated query", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    const spy = vi.spyOn(AbortSignal, "timeout");
    const request = new Request("http://localhost/api/x");
    await forward({
      method: "GET",
      path: "/api/students/PY001/assistance/history",
      query: { caseId: "case-1", stage: "design" },
      request,
      timeoutMs: 65_000,
    });
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "http://api.internal:4000/api/students/PY001/assistance/history?caseId=case-1&stage=design",
    );
    expect(spy).toHaveBeenCalledWith(65_000);
  });
});
