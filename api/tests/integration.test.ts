import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config/env";
import { createLogger } from "../src/lib/logger";

/**
 * Runs against a real PostgreSQL database with migrations applied.
 *   TEST_DATABASE_URL=postgresql://... pnpm --filter @skrp/api test
 * The tables are truncated before every test, so point it at a throwaway database.
 */
const url = process.env.TEST_DATABASE_URL;

const ADMIN = "admin-key-0123456789ab";
const INTERNAL = "internal-key-0123456789";

describe.skipIf(!url)("API with PostgreSQL", () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof createApp>;

  const api = () => ({
    get: (p: string) => request(app).get(p).set("x-internal-key", INTERNAL),
    put: (p: string) => request(app).put(p).set("x-internal-key", INTERNAL),
    post: (p: string) => request(app).post(p).set("x-internal-key", INTERNAL),
    adminGet: (p: string) =>
      request(app)
        .get(p)
        .set("x-internal-key", INTERNAL)
        .set("x-admin-key", ADMIN),
    adminPost: (p: string) =>
      request(app)
        .post(p)
        .set("x-internal-key", INTERNAL)
        .set("x-admin-key", ADMIN),
    adminPatch: (p: string) =>
      request(app)
        .patch(p)
        .set("x-internal-key", INTERNAL)
        .set("x-admin-key", ADMIN),
  });

  beforeAll(() => {
    const config = loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: url!,
      INTERNAL_API_KEY: INTERNAL,
      ADMIN_API_KEY: ADMIN,
    });
    prisma = new PrismaClient({ datasources: { db: { url: url! } } });
    app = createApp({ config, logger: createLogger(config), prisma });
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "code_revisions","student_artifacts","case_progress","students" CASCADE',
    );
  });

  it("reports readiness against the real database", async () => {
    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(200);
  });

  describe("students", () => {
    it("generates codes from attendance numbers", async () => {
      for (const n of [1, 2, 3, 1000]) {
        const res = await api()
          .adminPost("/api/students")
          .send({ attendanceNumber: n });
        expect(res.status).toBe(201);
        expect(res.body.data.studentCode).toBe(
          n === 1000 ? "PY1000" : `PY00${n}`,
        );
        expect(res.body.data.name).toBeNull();
      }
    });

    it("rejects invalid attendance numbers and unknown fields (no client-chosen codes)", async () => {
      for (const body of [
        { attendanceNumber: 0 },
        { attendanceNumber: -3 },
        { attendanceNumber: 1.5 },
        { attendanceNumber: "1" },
        { attendanceNumber: 1, studentCode: "PY999" },
      ]) {
        const res = await api().adminPost("/api/students").send(body);
        expect(res.status).toBe(400);
      }
    });

    it("lets exactly one of many concurrent creates win", async () => {
      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          api().adminPost("/api/students").send({ attendanceNumber: 7 }),
        ),
      );
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(results.filter((r) => r.status === 409)).toHaveLength(7);
      expect(await prisma.student.count()).toBe(1);
    });

    it("never changes the code on update", async () => {
      await api().adminPost("/api/students").send({ attendanceNumber: 5 });
      const res = await api()
        .adminPatch("/api/students/PY005")
        .send({ name: "Nama Uji", className: "XII-1" });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        studentCode: "PY005",
        attendanceNumber: 5,
        name: "Nama Uji",
      });
      const bad = await api()
        .adminPatch("/api/students/PY005")
        .send({ attendanceNumber: 9 });
      expect(bad.status).toBe(400);
    });

    it("import is idempotent and does not wipe existing names", async () => {
      const roster = {
        students: [{ attendanceNumber: 1, name: "A" }, { attendanceNumber: 2 }],
      };
      expect(
        (await api().adminPost("/api/students/import").send(roster)).status,
      ).toBe(200);
      expect(
        (await api().adminPost("/api/students/import").send(roster)).status,
      ).toBe(200);
      expect(await prisma.student.count()).toBe(2);
      // second import without a name for #2 and without name for #1 keeps what exists
      await api()
        .adminPost("/api/students/import")
        .send({ students: [{ attendanceNumber: 1 }] });
      expect(
        (await prisma.student.findUnique({ where: { attendanceNumber: 1 } }))
          ?.name,
      ).toBe("A");
    });

    it("exposes the profile publicly but lists the roster only to admins", async () => {
      await api()
        .adminPost("/api/students")
        .send({ attendanceNumber: 1, name: "Uji" });
      const profile = await api().get("/api/students/py001");
      expect(profile.status).toBe(200);
      expect(profile.body.data).toEqual({
        studentCode: "PY001",
        name: "Uji",
        className: null,
      });
      expect(profile.body.data.id).toBeUndefined();

      expect((await api().get("/api/students")).status).toBe(401);
      const list = await api().adminGet("/api/students");
      expect(list.status).toBe(200);
      expect(list.body.data.students).toHaveLength(1);
    });

    it("treats unknown and inactive students as 404", async () => {
      expect((await api().get("/api/students/PY404")).status).toBe(404);
      await api().adminPost("/api/students").send({ attendanceNumber: 2 });
      await api().adminPatch("/api/students/PY002").send({ isActive: false });
      expect((await api().get("/api/students/PY002")).status).toBe(404);
      expect((await api().get("/api/students/PY002/progress")).status).toBe(
        404,
      );
    });
  });

  describe("progress", () => {
    beforeEach(async () => {
      await api().adminPost("/api/students").send({ attendanceNumber: 1 });
      await api().adminPost("/api/students").send({ attendanceNumber: 2 });
    });

    it("tracks stage completion and marks the case completed after all four stages", async () => {
      const path = "/api/students/PY001/cases/case-1/progress";
      const first = await api()
        .put(path)
        .send({ currentStage: "design", completedStages: ["understand"] });
      expect(first.body.data).toMatchObject({
        status: "IN_PROGRESS",
        completedStages: ["understand"],
      });
      expect(first.body.data.completedAt).toBeNull();

      const dupes = await api()
        .put(path)
        .send({
          currentStage: "design",
          completedStages: ["understand", "understand"],
        });
      expect(dupes.body.data.completedStages).toEqual(["understand"]);

      const done = await api()
        .put(path)
        .send({
          currentStage: "test",
          completedStages: ["test", "understand", "design", "implement"],
        });
      expect(done.body.data.status).toBe("COMPLETED");
      expect(done.body.data.completedStages).toEqual([
        "understand",
        "design",
        "implement",
        "test",
      ]);
      expect(done.body.data.completedAt).not.toBeNull();
    });

    it("rejects invalid stages and case ids", async () => {
      const bad = await api()
        .put("/api/students/PY001/cases/case-1/progress")
        .send({ currentStage: "nope", completedStages: [] });
      expect(bad.status).toBe(400);
      const badCase = await api()
        .put("/api/students/PY001/cases/Bad_Case!/progress")
        .send({ currentStage: "design", completedStages: [] });
      expect(badCase.status).toBe(400);
    });

    it("keeps each student's data separate", async () => {
      await api()
        .put("/api/students/PY001/cases/case-1/progress")
        .send({ currentStage: "design", completedStages: ["understand"] });
      await api()
        .put("/api/students/PY001/cases/case-1/artifacts/pseudocode")
        .send({ content: "MULAI" });

      const other = await api().get("/api/students/PY002/progress");
      expect(other.body.data.cases).toEqual([]);
      expect(other.body.data.artifacts).toEqual([]);
      const mine = await api().get("/api/students/PY001/progress");
      expect(mine.body.data.cases).toHaveLength(1);
      expect(mine.body.data.artifacts[0]).toMatchObject({
        kind: "PSEUDOCODE",
        content: "MULAI",
      });
    });

    it("saves artifacts with kind/shape validation and upserts", async () => {
      const spec = {
        goal: "g",
        input: "i",
        process: "p",
        output: "o",
        constraints: "c",
      };
      const a = await api()
        .put("/api/students/PY001/cases/case-1/artifacts/problem-spec")
        .send({ content: spec });
      expect(a.status).toBe(200);
      await api()
        .put("/api/students/PY001/cases/case-1/artifacts/problem-spec")
        .send({ content: { ...spec, goal: "updated" } });
      expect(await prisma.studentArtifact.count()).toBe(1);

      const wrongShape = await api()
        .put("/api/students/PY001/cases/case-1/artifacts/pseudocode")
        .send({ content: spec });
      expect(wrongShape.status).toBe(400);
      const wrongCase = await api()
        .put("/api/students/PY001/cases/case-1/artifacts/reflection")
        .send({ content: "x" });
      expect(wrongCase.status).toBe(400);
      const reflection = await api()
        .put("/api/students/PY001/cases/journey/artifacts/reflection")
        .send({ content: "x" });
      expect(reflection.status).toBe(200);

      const flowchart = JSON.stringify({ nodes: [], edges: [] });
      const savedFlowchart = await api()
        .put("/api/students/PY001/cases/case-1/artifacts/flowchart")
        .send({ content: flowchart });
      expect(savedFlowchart.status).toBe(200);
      expect(savedFlowchart.body.data).toMatchObject({
        kind: "FLOWCHART",
        content: flowchart,
      });
      const flowchartAsObject = await api()
        .put("/api/students/PY001/cases/case-1/artifacts/flowchart")
        .send({ content: { nodes: [], edges: [] } });
      expect(flowchartAsObject.status).toBe(400);
    });

    describe("code revisions", () => {
      const path = "/api/students/PY001/cases/case-1/code-revisions";
      const execution = {
        status: "ok",
        stdinExhausted: false,
        durationMs: 12,
        stdout: "hi",
        stderr: "",
        traceback: null,
        executedAt: new Date().toISOString(),
        runtime: "pyodide",
        runtimeVersion: "0.27.7",
      };

      it("appends revisions and de-duplicates identical saves", async () => {
        const r1 = await api()
          .post(path)
          .send({ source: "print(1)", stdin: "" });
        expect(r1.status).toBe(201);
        expect(r1.body.data.revision.revision).toBe(1);

        const again = await api()
          .post(path)
          .send({ source: "print(1)", stdin: "" });
        expect(again.status).toBe(200);
        expect(again.body.data.created).toBe(false);

        const r2 = await api()
          .post(path)
          .send({ source: "print(2)", stdin: "3\n4" });
        expect(r2.body.data.revision.revision).toBe(2);
        expect(await prisma.codeRevision.count()).toBe(2);
      });

      it("attaches run metadata to the exact source and stdin it belongs to", async () => {
        await api().post(path).send({ source: "print('hi')", stdin: "a\nb" });
        const withRun = await api()
          .post(path)
          .send({ source: "print('hi')", stdin: "a\nb", execution });
        expect(withRun.body.data.created).toBe(false);
        expect(withRun.body.data.revision.execution.stdout).toBe("hi");

        const snapshot = await api().get("/api/students/PY001/progress");
        expect(snapshot.body.data.latestCode).toHaveLength(1);
        expect(snapshot.body.data.latestCode[0]).toMatchObject({
          source: "print('hi')",
          stdin: "a\nb",
          revision: 1,
        });

        // Different stdin is a different revision and does not inherit the old result.
        const changed = await api()
          .post(path)
          .send({ source: "print('hi')", stdin: "other" });
        expect(changed.body.data.revision.revision).toBe(2);
        expect(changed.body.data.revision.execution).toBeNull();
      });

      it("assigns unique sequential revisions under concurrent saves", async () => {
        const results = await Promise.all(
          Array.from({ length: 6 }, (_, i) =>
            api()
              .post(path)
              .send({ source: `print(${i})`, stdin: "" }),
          ),
        );
        const ok = results.filter((r) => r.status === 201);
        const numbers = ok
          .map((r) => r.body.data.revision.revision)
          .sort((a, b) => a - b);
        expect(new Set(numbers).size).toBe(numbers.length);
        expect(numbers[0]).toBe(1);
        // Anything that exhausted its retries must be a clean 409, never a 500.
        for (const r of results) expect([201, 409]).toContain(r.status);
      });

      it("rejects oversized source and bad metadata", async () => {
        expect(
          (
            await api()
              .post(path)
              .send({ source: "x".repeat(100_001), stdin: "" })
          ).status,
        ).toBe(400);
        expect(
          (
            await api()
              .post(path)
              .send({
                source: "a",
                stdin: "",
                execution: { ...execution, status: "weird" },
              })
          ).status,
        ).toBe(400);
      });
    });
  });
});
