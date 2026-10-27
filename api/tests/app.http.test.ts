import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config/env";
import { createLogger } from "../src/lib/logger";

/** HTTP-level behaviour that does not need a database (a stub stands in for Prisma). */
function makeApp(
  env: Record<string, string> = {},
  queryRaw = vi.fn().mockResolvedValue([{ "?column?": 1 }]),
) {
  const config = loadConfig({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://u:p@localhost:5432/db",
    ...env,
  });
  const prisma = { $queryRaw: queryRaw } as unknown as PrismaClient;
  return createApp({ config, logger: createLogger(config), prisma });
}

describe("health", () => {
  it("GET /health is up without touching the database", async () => {
    const queryRaw = vi.fn();
    const res = await request(makeApp({}, queryRaw)).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("GET /health/ready reports ready when the database answers", async () => {
    const res = await request(makeApp()).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready", database: "up" });
  });

  it("GET /health/ready returns 503 without leaking the error", async () => {
    const queryRaw = vi
      .fn()
      .mockRejectedValue(
        new Error("password authentication failed for user u"),
      );
    const res = await request(makeApp({}, queryRaw)).get("/health/ready");
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain("password");
  });
});

describe("request handling", () => {
  it("returns a normalised 404 for unknown routes", async () => {
    const res = await request(makeApp()).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects malformed student codes with 400 before touching the database", async () => {
    const res = await request(makeApp()).get("/api/students/not-a-code");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details[0].message).toMatch(/student code/i);
  });

  it("rejects malformed JSON and oversized bodies", async () => {
    const app = makeApp({ ADMIN_API_KEY: "a".repeat(20) });
    const bad = await request(app)
      .post("/api/students")
      .set("x-admin-key", "a".repeat(20))
      .set("content-type", "application/json")
      .send("{not json");
    expect(bad.status).toBe(400);

    const big = await request(app)
      .post("/api/students")
      .set("x-admin-key", "a".repeat(20))
      .send({ attendanceNumber: 1, name: "x".repeat(300_000) });
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("echoes a safe request id and ignores unsafe ones", async () => {
    const app = makeApp();
    const ok = await request(app)
      .get("/health")
      .set("x-request-id", "abc-12345678");
    expect(ok.headers["x-request-id"]).toBe("abc-12345678");
    const unsafe = await request(app)
      .get("/health")
      .set("x-request-id", "bad id\twith spaces");
    expect(unsafe.headers["x-request-id"]).not.toBe("bad id\twith spaces");
  });
});

describe("access control", () => {
  const INTERNAL = "internal-key-0123456789";
  const ADMIN = "admin-key-0123456789ab";

  it("requires the internal key on /api when configured, but not on /health", async () => {
    const app = makeApp({ INTERNAL_API_KEY: INTERNAL });
    expect((await request(app).get("/health")).status).toBe(200);
    expect((await request(app).get("/api/students/PY001")).status).toBe(401);
    expect(
      (
        await request(app)
          .get("/api/students/PY001")
          .set("x-internal-key", "wrong")
      ).status,
    ).toBe(401);
  });

  it("disables roster listing entirely without an admin key", async () => {
    const res = await request(makeApp()).get("/api/students");
    expect(res.status).toBe(403);
  });

  it("rejects roster listing with a wrong admin key", async () => {
    const app = makeApp({ ADMIN_API_KEY: ADMIN });
    expect((await request(app).get("/api/students")).status).toBe(401);
    expect(
      (await request(app).get("/api/students").set("x-admin-key", "nope"))
        .status,
    ).toBe(401);
  });

  it("treats empty optional variables (as passed by Docker Compose) as unset", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      ADMIN_API_KEY: "",
      GEMINI_API_KEY: "",
      GEMINI_MODEL: "",
      CORS_ORIGINS: "",
      ROUTING_SKIP_MIN_RATIO: "",
    });
    expect(config.adminApiKey).toBeUndefined();
    expect(config.ai.apiKey).toBeUndefined();
    expect(config.ai.model).toBe("gemini-2.5-flash");
    expect(config.routingSkipMinRatio).toBeUndefined();
  });

  it("requires INTERNAL_API_KEY in production config", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://u:p@db/x",
      }),
    ).toThrow(/INTERNAL_API_KEY/);
  });

  it("only enables CORS for configured origins", async () => {
    const closed = await request(makeApp())
      .get("/health")
      .set("origin", "https://evil.example");
    expect(closed.headers["access-control-allow-origin"]).toBeUndefined();

    const app = makeApp({ CORS_ORIGINS: "https://app.example.com" });
    const allowed = await request(app)
      .get("/health")
      .set("origin", "https://app.example.com");
    expect(allowed.headers["access-control-allow-origin"]).toBe(
      "https://app.example.com",
    );
    const other = await request(app)
      .get("/health")
      .set("origin", "https://evil.example");
    expect(other.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
