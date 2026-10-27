/**
 * TEST-ONLY server: the real Express app with a controllable FAKE model, for browser
 * end-to-end checks without a Gemini key. Not used by src/server.ts and never shipped.
 *
 *   DATABASE_URL=... PORT=4040 tsx tests/support/fakeAiServer.ts
 *   curl -XPOST :4040/__fake/mode -H 'content-type: application/json' \
 *        -d '{"evaluate":"fail","hint":"ok","delayMs":0}'
 */
import express from "express";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app";
import { loadConfig } from "../../src/config/env";
import { RUBRIC } from "../../src/config/rubric";
import { AiError, type ModelRunner } from "../../src/integrations/langchain";
import { createLogger } from "../../src/lib/logger";

const mode = { evaluate: "ok", hint: "ok", delayMs: 0, score: 8 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const runner: ModelRunner = {
  modelName: "fake-e2e-model",
  async invokeStructured(req) {
    if (mode.delayMs) await sleep(mode.delayMs);
    if (req.name === "hint") {
      if (mode.hint === "fail") throw new AiError("UNAVAILABLE");
      const level =
        /DIIZINKAN saat ini adalah (L\d)/.exec(req.system)?.[1] ?? "?";
      return {
        output: {
          hint: `Petunjuk contoh pada tingkat ${level}: pikirkan inputnya dulu.`,
        },
        modelName: "fake-e2e-model",
        durationMs: 1,
      };
    }
    if (mode.evaluate === "fail") throw new AiError("TIMEOUT");
    const stage = /stage: (\w+)/.exec(req.user)![1] as keyof typeof RUBRIC;
    const submissionRef = /submissionRef: (\w+)/.exec(req.user)![1];
    return {
      output: {
        stage,
        submissionRef,
        criteria: RUBRIC[stage].map((c) => ({
          key: c.key,
          score: mode.score,
          evidence: `Bukti untuk ${c.label}`,
        })),
        wentWell: ["Langkah awal sudah jelas"],
        needsImprovement: ["Perjelas kasus batas"],
        feedback: "Bagus, lengkapi kasus batas.",
        insufficientEvidence: false,
        uncertaintyNotes: "",
      },
      modelName: "fake-e2e-model",
      durationMs: 1,
    };
  },
};

const config = loadConfig({
  ...process.env,
  NODE_ENV: "development",
  DATABASE_URL: process.env.DATABASE_URL!,
  INTERNAL_API_KEY: process.env.INTERNAL_API_KEY ?? "internal-key-0123456789",
});
const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.post("/__fake/mode", (req, res) => {
  Object.assign(mode, req.body);
  res.json(mode);
});
app.use(
  createApp({
    config,
    logger: createLogger({ logLevel: "warn" }),
    prisma,
    runner,
    evaluationLimits: {
      maxPerHour: 1000,
      maxAttemptsPerSubmission: 10,
      retryCooldownMs: 0,
      pendingStaleMs: 90_000,
    },
    assistanceLimits: { maxPerStage: 50, minIntervalMs: 0 },
  }),
);
app.listen(Number(process.env.PORT ?? 4040), () =>
  console.log("fake-ai api up"),
);
