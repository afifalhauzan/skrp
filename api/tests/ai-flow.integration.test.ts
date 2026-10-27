import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config/env";
import { RUBRIC } from "../src/config/rubric";
import {
  AiError,
  type ModelRunner,
  type StructuredRequest,
} from "../src/integrations/langchain";
import { createLogger } from "../src/lib/logger";

/**
 * AI evaluation / assistance / routing against a real PostgreSQL, with a FAKE model.
 * No Gemini call is made here. Run with TEST_DATABASE_URL (tables are truncated).
 */
const url = process.env.TEST_DATABASE_URL;
const INTERNAL = "internal-key-0123456789";
const STAGES = ["understand", "design", "implement", "test"] as const;
type Stage = (typeof STAGES)[number];

const SPEC = {
  goal: "hitung tarif",
  input: "jenis, jam",
  process: "aturan tarif",
  output: "Tarif: n",
  constraints: "maks 20000",
};

function evaluationOutput(
  req: StructuredRequest,
  score = 8,
  overrides: Record<string, unknown> = {},
) {
  const stage = /stage: (\w+)/.exec(req.user)![1] as Stage;
  const submissionRef = /submissionRef: (\w+)/.exec(req.user)![1];
  return {
    stage,
    submissionRef,
    criteria: RUBRIC[stage].map((c) => ({
      key: c.key,
      score,
      evidence: `bukti untuk ${c.key}`,
    })),
    wentWell: ["Bagian awal sudah jelas"],
    needsImprovement: ["Perjelas kasus batas"],
    feedback: "Lanjutkan dengan melengkapi kasus batas.",
    insufficientEvidence: false,
    uncertaintyNotes: "",
    ...overrides,
  };
}

interface Fake {
  runner: ModelRunner;
  evaluate: ReturnType<typeof vi.fn>;
  hint: ReturnType<typeof vi.fn>;
}
function fakeRunner(): Fake {
  const evaluate = vi.fn((req: StructuredRequest) => evaluationOutput(req));
  const hint = vi.fn((_req: StructuredRequest) => ({
    hint: "Coba pikirkan dulu: data apa yang kamu punya?",
  }));
  const runner: ModelRunner = {
    modelName: "fake-model",
    async invokeStructured(req) {
      const output = req.name === "hint" ? hint(req) : evaluate(req);
      return { output, modelName: "fake-model", durationMs: 3 };
    },
  };
  return { runner, evaluate, hint };
}

describe.skipIf(!url)(
  "AI evaluation, assistance and routing (PostgreSQL + fake model)",
  () => {
    let prisma: PrismaClient;
    const CODE = "PY001";
    const code = (n = "1") => `/api/students/PY00${n}`;

    const build = (
      fake: Fake,
      env: Record<string, string> = {},
      flags: { requireEvaluationForProgress?: boolean } = {},
    ) => {
      const config = loadConfig({
        NODE_ENV: "test",
        DATABASE_URL: url!,
        INTERNAL_API_KEY: INTERNAL,
        GEMINI_API_KEY: "test-key-not-used",
        ...env,
      });
      const app = createApp({
        config,
        logger: createLogger(config),
        prisma,
        runner: fake.runner,
        evaluationLimits: {
          maxPerHour: 1000,
          maxAttemptsPerSubmission: 3,
          retryCooldownMs: 0,
          pendingStaleMs: 90_000,
        },
        assistanceLimits: { maxPerStage: 15, minIntervalMs: 0 },
        ...flags,
      });
      const h = (r: request.Test) => r.set("x-internal-key", INTERNAL);
      return {
        get: (p: string) => h(request(app).get(p)),
        put: (p: string) => h(request(app).put(p)),
        post: (p: string) => h(request(app).post(p)),
      };
    };
    type Api = ReturnType<typeof build>;

    const putSpec = (api: Api, caseId = "case-1", spec = SPEC) =>
      api
        .put(`${code()}/cases/${caseId}/artifacts/problem-spec`)
        .send({ content: spec });
    const putPseudo = (api: Api, text: string, caseId = "case-1") =>
      api
        .put(`${code()}/cases/${caseId}/artifacts/pseudocode`)
        .send({ content: text });
    const putCode = (api: Api, source: string, caseId = "case-1") =>
      api
        .post(`${code()}/cases/${caseId}/code-revisions`)
        .send({ source, stdin: "mobil\n2" });
    const evaluate = (
      api: Api,
      stage: Stage,
      extra: Record<string, unknown> = {},
      caseId = "case-1",
    ) =>
      api
        .post(`${code()}/evaluations/stages`)
        .send({ caseId, stage, ...extra });
    const complete = (api: Api, stages: Stage[], caseId = "case-1") =>
      api
        .put(`${code()}/cases/${caseId}/progress`)
        .send({ currentStage: "design", completedStages: stages });

    async function finishCase(api: Api, caseId: string) {
      await putSpec(api, caseId);
      await putPseudo(api, "MULAI\nbaca\nSELESAI", caseId);
      await putCode(api, "print('Tarif: 5000')", caseId);
      const done: Stage[] = [];
      for (const stage of STAGES) {
        expect((await evaluate(api, stage, {}, caseId)).status).toBe(201);
        done.push(stage);
        expect((await complete(api, [...done], caseId)).status).toBe(200);
      }
    }

    beforeAll(async () => {
      prisma = new PrismaClient({ datasources: { db: { url: url! } } });
    });
    afterAll(async () => {
      await prisma.$disconnect();
    });
    beforeEach(async () => {
      await prisma.$executeRawUnsafe('TRUNCATE "students" CASCADE');
      await prisma.student.create({
        data: { studentCode: CODE, attendanceNumber: 1, name: "Uji" },
      });
      await prisma.student.create({
        data: { studentCode: "PY002", attendanceNumber: 2, name: "Lain" },
      });
    });

    // ------------------------------------------------------------------ evaluation
    describe("stage evaluation", () => {
      it("persists a valid evaluation with criterion rows, rubric version and the assessed artifact revision", async () => {
        const fake = fakeRunner();
        const api = build(fake);
        await putSpec(api);
        const res = await evaluate(api, "understand");

        expect(res.status).toBe(201);
        const ev = res.body.data.evaluation;
        expect(ev).toMatchObject({
          status: "COMPLETED",
          stage: "understand",
          rubricVersion: "rubric-provisional-v1",
          totalScore: 32,
          maxScore: 40,
          isCurrent: true,
        });
        expect(ev.criteria).toHaveLength(4);
        expect(ev.criteria[0]).toMatchObject({
          key: "goal",
          score: 8,
          maxScore: 10,
        });
        expect(ev.completion.satisfied).toBe(true);

        const rows = await prisma.criterionResult.count({
          where: { evaluationId: ev.id },
        });
        expect(rows).toBe(4);
        const links = await prisma.evaluationArtifact.findMany({
          where: { evaluationId: ev.id },
          include: { artifactRevision: true },
        });
        expect(links).toHaveLength(1);
        expect(links[0]!.artifactRevision).toMatchObject({
          kind: "PROBLEM_SPEC",
          revisionNumber: 1,
        });

        const fetched = await api.get(`${code()}/evaluations/stages/${ev.id}`);
        expect(fetched.body.data.id).toBe(ev.id);
      });

      it("references the exact code revision it assessed, and keeps history after the code changes", async () => {
        const api = build(fakeRunner());
        await putSpec(api);
        await putPseudo(api, "MULAI");
        await complete(api, ["understand", "design"]).catch(() => undefined);
        await prisma.caseProgress.create({
          data: {
            studentId: (await prisma.student.findUnique({
              where: { studentCode: CODE },
            }))!.id,
            caseId: "case-1",
            completedStages: ["understand", "design"],
          },
        });
        const r1 = (await putCode(api, "print('v1')")).body.data.revision
          .revision;
        const first = await evaluate(api, "implement");
        expect(first.body.data.evaluation.codeRevision).toBe(r1);

        const r2 = (await putCode(api, "print('v2')")).body.data.revision
          .revision;
        expect(r2).toBe(r1 + 1);
        const second = await evaluate(api, "implement");
        expect(second.body.data.evaluation.codeRevision).toBe(r2);
        expect(second.body.data.evaluation.id).not.toBe(
          first.body.data.evaluation.id,
        );

        // the earlier evaluation is preserved but no longer describes the latest work
        const old = await api.get(
          `${code()}/evaluations/stages/${first.body.data.evaluation.id}`,
        );
        expect(old.body.data).toMatchObject({
          codeRevision: r1,
          status: "COMPLETED",
          isCurrent: false,
        });
        expect(old.body.data.completion.satisfied).toBe(false);
      });

      it("rejects invalid model output: nothing is scored, the stage stays locked, work is kept", async () => {
        const fake = fakeRunner();
        fake.evaluate.mockImplementation((req: StructuredRequest) =>
          evaluationOutput(req, 8, { criteria: [] }),
        );
        const api = build(fake);
        await putSpec(api);

        const res = await evaluate(api, "understand");
        expect(res.status).toBe(502);
        expect(res.body.error.code).toBe("AI_INVALID_RESPONSE");
        const row = await prisma.stageEvaluation.findFirstOrThrow({});
        expect(row).toMatchObject({
          status: "FAILED",
          failureCategory: "INVALID_RESPONSE",
          totalScore: null,
        });
        expect(await prisma.criterionResult.count()).toBe(0);
        expect(res.body.error.meta.evaluationId).toBe(row.id);

        expect((await complete(api, ["understand"])).status).toBe(409);
      });

      it.each([
        ["TIMEOUT", 504, "AI_TIMEOUT"],
        ["RATE_LIMITED", 503, "AI_RATE_LIMITED"],
        ["UNAVAILABLE", 503, "AI_UNAVAILABLE"],
        ["NOT_CONFIGURED", 503, "AI_NOT_CONFIGURED"],
      ] as const)(
        "a %s provider failure is reported honestly, does not unlock the stage, and keeps student work",
        async (category, status, apiCode) => {
          const fake = fakeRunner();
          fake.evaluate.mockImplementation(() => {
            throw new AiError(category);
          });
          const api = build(fake);
          await putSpec(api);

          const res = await evaluate(api, "understand");
          expect(res.status).toBe(status);
          expect(res.body.error.code).toBe(apiCode);
          expect(JSON.stringify(res.body)).not.toMatch(/key|AIza|stack/i);

          expect((await complete(api, ["understand"])).status).toBe(409);
          const snapshot = (await api.get(`${code()}/progress`)).body.data;
          expect(
            snapshot.cases.find(
              (c: { caseId: string }) => c.caseId === "case-1",
            )?.completedStages ?? [],
          ).toEqual([]);
          expect(
            snapshot.artifacts.find(
              (a: { kind: string }) => a.kind === "PROBLEM_SPEC",
            ).content,
          ).toEqual(SPEC);
          expect(snapshot.stageEvaluations[0]).toMatchObject({
            status: "FAILED",
            failure: { category },
          });
        },
      );

      it("lets the student retry after a failure (new attempt) and succeed", async () => {
        const fake = fakeRunner();
        fake.evaluate.mockImplementationOnce(() => {
          throw new AiError("UNAVAILABLE");
        });
        const api = build(fake);
        await putSpec(api);

        expect((await evaluate(api, "understand")).status).toBe(503);
        const retry = await evaluate(api, "understand");
        expect(retry.status).toBe(201);
        expect(retry.body.data.evaluation).toMatchObject({
          status: "COMPLETED",
          attempt: 2,
        });
        expect(await prisma.stageEvaluation.count()).toBe(2);
      });

      it("does not call the model again for a duplicate submission of the same work", async () => {
        const fake = fakeRunner();
        const api = build(fake);
        await putSpec(api);

        const [a, b, c] = await Promise.all([
          evaluate(api, "understand"),
          evaluate(api, "understand"),
          evaluate(api, "understand"),
        ]);
        const again = await evaluate(api, "understand");
        const ids = new Set(
          [a, b, c, again].map((r) => r.body.data.evaluation.id),
        );
        expect(ids.size).toBe(1);
        expect(await prisma.stageEvaluation.count()).toBe(1);
        expect(fake.evaluate.mock.calls.length).toBeLessThanOrEqual(3);
        expect(again.status).toBe(200);
        expect(again.body.data.created).toBe(false);
      });

      it("caps explicit retries of the same failing submission", async () => {
        const fake = fakeRunner();
        fake.evaluate.mockImplementation(() => {
          throw new AiError("UNAVAILABLE");
        });
        const api = build(fake);
        await putSpec(api);
        for (let i = 0; i < 3; i++)
          expect((await evaluate(api, "understand")).status).toBe(503);
        expect((await evaluate(api, "understand")).status).toBe(429);
        expect(fake.evaluate).toHaveBeenCalledTimes(3);
      });

      it("rejects empty work, out-of-order stages, stale code revisions, and bad input", async () => {
        const api = build(fakeRunner());
        expect((await evaluate(api, "understand")).status).toBe(409); // nothing written yet
        await putSpec(api);
        expect((await evaluate(api, "design")).status).toBe(409); // stage 1 not completed
        expect((await evaluate(api, "nonsense" as Stage)).status).toBe(400);
        expect(
          (
            await api
              .post(`${code()}/evaluations/stages`)
              .send({ caseId: "case-9", stage: "understand" })
          ).status,
        ).toBe(404);
        expect(
          (
            await api
              .post(`${code("9")}/evaluations/stages`)
              .send({ caseId: "case-1", stage: "understand" })
          ).status,
        ).toBe(404);
      });

      it("rejects a stale code revision supplied by the client", async () => {
        const api = build(fakeRunner());
        const student = await prisma.student.findUniqueOrThrow({
          where: { studentCode: CODE },
        });
        await prisma.caseProgress.create({
          data: {
            studentId: student.id,
            caseId: "case-1",
            completedStages: ["understand", "design"],
          },
        });
        await putCode(api, "print(1)");
        await putCode(api, "print(2)");
        const stale = await evaluate(api, "implement", { codeRevision: 1 });
        expect(stale.status).toBe(409);
        expect(stale.body.error.code).toBe("STALE_ARTIFACT");
        expect(
          (await evaluate(api, "implement", { codeRevision: 2 })).status,
        ).toBe(201);
      });

      it("does not let one student read or evaluate another's work", async () => {
        const api = build(fakeRunner());
        await putSpec(api);
        const ev = (await evaluate(api, "understand")).body.data.evaluation;
        expect(
          (await api.get(`${code("2")}/evaluations/stages/${ev.id}`)).status,
        ).toBe(404);
      });

      it("never trusts client-supplied completion: a stage cannot be marked complete without a current evaluation", async () => {
        const api = build(fakeRunner());
        await putSpec(api);
        expect((await complete(api, ["understand"])).status).toBe(409);
        await evaluate(api, "understand");
        expect((await complete(api, ["understand"])).status).toBe(200);
        // editing after the evaluation invalidates it for a later stage's check, history is kept
        await putSpec(api, "case-1", { ...SPEC, goal: "diubah" });
        expect((await evaluate(api, "understand")).status).toBe(201);
        expect(await prisma.stageEvaluation.count()).toBe(2);
        // stages cannot be skipped over
        expect((await complete(api, ["understand", "implement"])).status).toBe(
          409,
        );
      });

      it("blocks completing a stage after the work changed since its evaluation", async () => {
        const api = build(fakeRunner());
        await putSpec(api);
        await evaluate(api, "understand");
        await putSpec(api, "case-1", { ...SPEC, output: "berbeda" });
        const res = await complete(api, ["understand"]);
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("INVALID_STATE");
      });
    });

    // ------------------------------------------------------------------ assistance
    describe("assistance (micro scaffolding)", () => {
      const hint = (
        api: Api,
        stage: Stage = "understand",
        requestId = crypto.randomUUID(),
        caseId = "case-1",
      ) =>
        api
          .post(`${code()}/assistance/hint`)
          .send({ caseId, stage, requestId });

      it("starts at L1, escalates only by backend policy, and stores each interaction", async () => {
        const fake = fakeRunner();
        const api = build(fake);
        const levels: string[] = [];
        for (let i = 0; i < 5; i++)
          levels.push((await hint(api)).body.data.interaction.level);
        expect(levels).toEqual(["L1", "L1", "L2", "L2", "L3"]);
        expect(await prisma.assistanceInteraction.count()).toBe(5);

        const history = (
          await api.get(
            `${code()}/assistance/history?caseId=case-1&stage=understand`,
          )
        ).body.data;
        expect(history.interactions).toHaveLength(5);
        expect(history.nextLevel).toBe("L3");
        expect(history.maxLevel).toBe("L5");
      });

      it("never exceeds the level cap of the case, even with many requests", async () => {
        const api = build(fakeRunner());
        const levels: string[] = [];
        for (let i = 0; i < 12; i++)
          levels.push(
            (await hint(api, "understand", crypto.randomUUID(), "case-3")).body
              .data.interaction.level,
          );
        expect(new Set(levels)).toEqual(new Set(["L1", "L2", "L3"]));
        expect(levels.at(-1)).toBe("L3");
      });

      it("ignores any level the model tries to return", async () => {
        const fake = fakeRunner();
        fake.hint.mockImplementation(() => ({
          hint: "Coba mulai dari mengidentifikasi input.",
          level: "L5",
          assistanceType: "direct-explanation",
        }));
        const api = build(fake);
        const res = await hint(api);
        expect(res.body.data.interaction).toMatchObject({
          level: "L1",
          assistanceType: "prompting-question",
          status: "GENERATED",
        });
        expect(fake.hint.mock.calls[0]![0].system).toContain("L1");
      });

      it("rejects a model hint that would exceed the level (code at L1) and falls back clearly", async () => {
        const fake = fakeRunner();
        fake.hint.mockImplementation(() => ({
          hint: "Tulis begini:\n```python\nprint(1)\n```",
        }));
        const api = build(fake);
        const res = await hint(api);
        expect(res.status).toBe(201);
        expect(res.body.data.interaction).toMatchObject({
          status: "FALLBACK",
          level: "L1",
          failureCategory: "INVALID_RESPONSE",
        });
        expect(res.body.data.interaction.content).not.toContain("```");
      });

      it("uses a labelled fallback when Gemini is unavailable and does not escalate for it", async () => {
        const fake = fakeRunner();
        fake.hint.mockImplementationOnce(() => {
          throw new AiError("TIMEOUT");
        });
        const api = build(fake);
        const first = await hint(api);
        expect(first.body.data.interaction).toMatchObject({
          status: "FALLBACK",
          failureCategory: "TIMEOUT",
          level: "L1",
        });
        const second = await hint(api);
        expect(second.body.data.interaction).toMatchObject({
          status: "GENERATED",
          level: "L1",
        });
        const third = await hint(api);
        expect(third.body.data.interaction.level).toBe("L1"); // only one real hint so far at L1 -> still L1
        const fourth = await hint(api);
        expect(fourth.body.data.interaction.level).toBe("L2");
      });

      it("is idempotent per requestId", async () => {
        const fake = fakeRunner();
        const api = build(fake);
        const requestId = crypto.randomUUID();
        const [a, b] = await Promise.all([
          hint(api, "understand", requestId),
          hint(api, "understand", requestId),
        ]);
        const again = await hint(api, "understand", requestId);
        expect(
          new Set([a, b, again].map((r) => r.body.data.interaction.id)).size,
        ).toBe(1);
        expect(await prisma.assistanceInteraction.count()).toBe(1);
        expect(again.status).toBe(200);
      });

      it("keeps assistance history per stage and records activity evidence for future policies", async () => {
        const api = build(fakeRunner());
        await hint(api, "understand");
        const row = await prisma.assistanceInteraction.findFirstOrThrow({});
        expect(row.activityEvidence).toMatchObject({
          requestsInStage: 0,
          hasCode: false,
        });
        expect(row).toMatchObject({
          trigger: "HINT_REQUEST",
          policyVersion: "assistance-provisional-v1",
        });
        const other = (
          await api.get(
            `${code()}/assistance/history?caseId=case-1&stage=design`,
          )
        ).body.data;
        expect(other.interactions).toEqual([]);
        expect(other.nextLevel).toBe("L1");
      });

      it("validates input and enforces a per-stage cap", async () => {
        const api = build(fakeRunner());
        expect(
          (
            await api
              .post(`${code()}/assistance/hint`)
              .send({
                caseId: "case-1",
                stage: "understand",
                requestId: "nope",
              })
          ).status,
        ).toBe(400);
        expect((await hint(api, "design")).status).toBe(409); // stage not reachable yet
        for (let i = 0; i < 15; i++) expect((await hint(api)).status).toBe(201);
        expect((await hint(api)).status).toBe(429);
      });
    });

    // ------------------------------------------------------------------ case + routing
    describe("case evaluation and routing (macro scaffolding)", () => {
      it("holds (no next case) while stage evidence is missing, and records no completion", async () => {
        const api = build(fakeRunner());
        await putSpec(api);
        await evaluate(api, "understand");
        const res = await api
          .post(`${code()}/evaluations/cases`)
          .send({ caseId: "case-1" });
        expect(res.status).toBe(200);
        expect(res.body.data.caseEvaluation).toMatchObject({
          status: "INSUFFICIENT_EVIDENCE",
        });
        expect(res.body.data.caseEvaluation.summary.missingStages).toEqual([
          "design",
          "implement",
          "test",
        ]);
        expect(res.body.data.routing).toMatchObject({
          status: "HOLD_INSUFFICIENT_EVIDENCE",
          nextCaseId: null,
          provisional: true,
        });
      });

      it("routes Case 1 -> Case 2 by the provisional policy, persisting evidence and policy version", async () => {
        const api = build(fakeRunner());
        await finishCase(api, "case-1");
        const res = await api
          .post(`${code()}/evaluations/cases`)
          .send({ caseId: "case-1" });
        const { caseEvaluation, routing } = res.body.data;

        expect(caseEvaluation).toMatchObject({
          status: "COMPLETED",
          policyVersion: "case-evaluation-provisional-v1",
        });
        expect(caseEvaluation.stageEvaluationIds).toHaveLength(4);
        expect(caseEvaluation.summary).toMatchObject({
          totalScore: 128,
          maxScore: 160,
        });
        expect(routing).toMatchObject({
          currentCaseId: "case-1",
          nextCaseId: "case-2",
          status: "ADVANCE",
          policyVersion: "routing-provisional-v1",
          caseEvaluationId: caseEvaluation.id,
        });

        // idempotent: same evidence -> same records
        const again = await api
          .post(`${code()}/evaluations/cases`)
          .send({ caseId: "case-1" });
        expect(again.body.data.caseEvaluation.id).toBe(caseEvaluation.id);
        expect(again.body.data.routing.id).toBe(routing.id);
        expect(await prisma.routingDecision.count()).toBe(1);
        expect(await prisma.caseEvaluation.count()).toBe(1);

        const snapshot = (await api.get(`${code()}/progress`)).body.data;
        expect(snapshot.routing[0].id).toBe(routing.id);
        expect(
          snapshot.cases.find((c: { caseId: string }) => c.caseId === "case-1")
            .status,
        ).toBe("COMPLETED");
      });

      it("a technical AI failure never counts as evidence of low competence or changes routing", async () => {
        const fake = fakeRunner();
        const api = build(fake);
        await putSpec(api);
        await evaluate(api, "understand");
        fake.evaluate.mockImplementation(() => {
          throw new AiError("UNAVAILABLE");
        });
        await putPseudo(api, "MULAI");
        await complete(api, ["understand"]);
        await evaluate(api, "design"); // fails
        const res = await api
          .post(`${code()}/evaluations/cases`)
          .send({ caseId: "case-1" });
        expect(res.body.data.routing.status).toBe("HOLD_INSUFFICIENT_EVIDENCE");
        expect(
          res.body.data.caseEvaluation.summary.stages.find(
            (s: { stage: string }) => s.stage === "design",
          ).totalScore,
        ).toBeNull();
      });

      it("records a skipped case as SKIPPED (never COMPLETED) when the configured skip applies", async () => {
        const api = build(fakeRunner(), { ROUTING_SKIP_MIN_RATIO: "0.7" });
        await finishCase(api, "case-1");
        const res = await api
          .post(`${code()}/evaluations/cases`)
          .send({ caseId: "case-1" });
        expect(res.body.data.routing).toMatchObject({
          status: "ADVANCE_WITH_SKIP",
          nextCaseId: "case-3",
          skippedCaseIds: ["case-2"],
        });

        const student = await prisma.student.findUniqueOrThrow({
          where: { studentCode: CODE },
        });
        const skipped = await prisma.caseProgress.findUniqueOrThrow({
          where: {
            studentId_caseId: { studentId: student.id, caseId: "case-2" },
          },
        });
        expect(skipped.status).toBe("SKIPPED");
        expect(skipped.completedStages).toEqual([]);
        expect(skipped.completedAt).toBeNull();
        const snapshot = (await api.get(`${code()}/progress`)).body.data;
        expect(
          snapshot.cases.find((c: { caseId: string }) => c.caseId === "case-2")
            .status,
        ).toBe("SKIPPED");
      });

      it("does not skip without explicit configuration, whatever the score", async () => {
        const fake = fakeRunner();
        fake.evaluate.mockImplementation((req: StructuredRequest) =>
          evaluationOutput(req, 10),
        );
        const api = build(fake);
        await finishCase(api, "case-1");
        const res = await api
          .post(`${code()}/evaluations/cases`)
          .send({ caseId: "case-1" });
        expect(res.body.data.routing).toMatchObject({
          status: "ADVANCE",
          nextCaseId: "case-2",
          skippedCaseIds: [],
        });
        expect(
          await prisma.caseProgress.count({ where: { status: "SKIPPED" } }),
        ).toBe(0);
      });

      it("never overwrites a COMPLETED case with SKIPPED", async () => {
        const api = build(fakeRunner(), { ROUTING_SKIP_MIN_RATIO: "0.5" });
        await finishCase(api, "case-2");
        await finishCase(api, "case-1");
        await api
          .post(`${code()}/evaluations/cases`)
          .send({ caseId: "case-1" });
        const student = await prisma.student.findUniqueOrThrow({
          where: { studentCode: CODE },
        });
        const c2 = await prisma.caseProgress.findUniqueOrThrow({
          where: {
            studentId_caseId: { studentId: student.id, caseId: "case-2" },
          },
        });
        expect(c2.status).toBe("COMPLETED");
      });

      it("ends the journey after the last case", async () => {
        const api = build(fakeRunner());
        await finishCase(api, "case-3");
        const res = await api
          .post(`${code()}/evaluations/cases`)
          .send({ caseId: "case-3" });
        expect(res.body.data.routing).toMatchObject({
          status: "JOURNEY_COMPLETE",
          nextCaseId: null,
        });
      });

      it("exposes the backend-owned case catalogue", async () => {
        const api = build(fakeRunner());
        const res = await api.get("/api/cases");
        expect(
          res.body.data.map((c: { id: string; support: string }) => [
            c.id,
            c.support,
          ]),
        ).toEqual([
          ["case-1", "HIGH"],
          ["case-2", "MODERATE"],
          ["case-3", "LOW"],
        ]);
      });
    });
  },
);
