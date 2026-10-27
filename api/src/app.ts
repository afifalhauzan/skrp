import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import type { PrismaClient } from "@prisma/client";
import type { AppConfig } from "./config/env";
import { AiController } from "./controllers/aiController";
import { CASE_ORDER } from "./config/cases";
import { createGeminiRunner, type ModelRunner } from "./integrations/langchain";
import { AiRepository } from "./repositories/aiRepository";
import { AssistanceService } from "./services/assistanceService";
import { CaseEvaluationService } from "./services/caseEvaluationService";
import type { EvaluationLimits } from "./services/evaluationService";
import type { AssistanceLimits } from "./services/assistanceService";
import { EvaluationService } from "./services/evaluationService";
import { createAssistancePolicy } from "./policies/assistance";
import { DEFAULT_COMPLETION_CONFIG } from "./policies/completion";
import { createRoutingPolicy } from "./policies/routing";
import { ProgressController } from "./controllers/progressController";
import { StudentController } from "./controllers/studentController";
import type { Logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { ProgressRepository } from "./repositories/progressRepository";
import { StudentRepository } from "./repositories/studentRepository";
import { createHealthRouter } from "./routes/health";
import { createApiRouter } from "./routes";
import { ProgressService } from "./services/progressService";
import { StudentService } from "./services/studentService";

export interface AppDeps {
  config: AppConfig;
  logger: Logger;
  prisma: PrismaClient;
  /** Inject a fake in tests; defaults to the LangChain/Gemini runner. */
  runner?: ModelRunner;
  requireEvaluationForProgress?: boolean;
  /** Override anti-abuse limits (tests). */
  evaluationLimits?: EvaluationLimits;
  assistanceLimits?: AssistanceLimits;
}

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

/** Builds the Express app. Startup (listen, signals, DB connect) lives in server.ts. */
export function createApp({
  config,
  logger,
  prisma,
  runner,
  requireEvaluationForProgress,
  evaluationLimits,
  assistanceLimits,
}: AppDeps) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers["x-request-id"];
        const id =
          typeof incoming === "string" && SAFE_REQUEST_ID.test(incoming)
            ? incoming
            : randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
      // Keep one compact line per request instead of full header dumps.
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500
          ? "error"
          : res.statusCode >= 400
            ? "warn"
            : "info",
    }),
  );
  app.use(helmet());

  if (config.corsOrigins.length > 0) {
    app.use(
      cors({
        origin: config.corsOrigins,
        methods: ["GET", "POST", "PUT", "PATCH"],
        maxAge: 600,
      }),
    );
  }

  app.use(express.json({ limit: "256kb" }));

  app.use(createHealthRouter(prisma));

  const studentRepository = new StudentRepository(prisma);
  const progressRepository = new ProgressRepository(prisma);
  const studentService = new StudentService(studentRepository);
  const aiRepository = new AiRepository(prisma);
  const modelRunner = runner ?? createGeminiRunner(config.ai);
  const evaluationService = new EvaluationService({
    ai: aiRepository,
    progress: progressRepository,
    students: studentService,
    runner: modelRunner,
    logger,
    limits: evaluationLimits,
    completion: DEFAULT_COMPLETION_CONFIG,
    requireEvaluationForProgress:
      requireEvaluationForProgress ?? config.requireEvaluationForProgress,
  });
  const assistanceService = new AssistanceService({
    ai: aiRepository,
    progress: progressRepository,
    students: studentService,
    runner: modelRunner,
    policy: createAssistancePolicy(),
    limits: assistanceLimits,
    logger,
  });
  const caseEvaluationService = new CaseEvaluationService({
    ai: aiRepository,
    students: studentService,
    routing: createRoutingPolicy({
      caseOrder: CASE_ORDER,
      skip: {
        enabled: config.routingSkipMinRatio !== undefined,
        fromCaseId: "case-1",
        minScoreRatio: config.routingSkipMinRatio ?? null,
      },
    }),
  });
  const progressService = new ProgressService(
    studentService,
    progressRepository,
    evaluationService,
    aiRepository,
  );
  app.use(
    "/api",
    createApiRouter(
      config,
      new StudentController(studentService),
      new ProgressController(progressService),
      new AiController(
        evaluationService,
        assistanceService,
        caseEvaluationService,
      ),
    ),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
