import { z } from "zod";

/** Used only when GEMINI_MODEL is unset. Chosen for structured-output support and low latency. */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const csv = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    CORS_ORIGINS: z.string().optional(),
    /** Shared secret the Next.js BFF sends as `x-internal-key`. Required in production. */
    INTERNAL_API_KEY: z.string().min(16).optional(),
    /** Enables the administrative roster endpoints when set (`x-admin-key`). */
    ADMIN_API_KEY: z.string().min(16).optional(),
    /** Server-side only. Missing key = AI features return AI_NOT_CONFIGURED (no mock output). */
    GEMINI_API_KEY: z.string().min(1).optional(),
    /** Gemini model id used for evaluation and hints (see README for the documented choice). */
    GEMINI_MODEL: z.string().min(1).optional(),
    /** Per-attempt provider timeout in ms. */
    AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(20000),
    /** Extra attempts for transient provider failures (timeouts, 429, 5xx). */
    AI_MAX_RETRIES: z.coerce.number().int().min(0).max(3).default(1),
    /** Minimum raw stage score (of 40) to continue to the next stage. 0 disables the minimum. */
    STAGE_MIN_SCORE: z.coerce.number().int().min(0).max(40).default(20),
    /** Dev override: enables skipping Case 2 after Case 1 when the score ratio (0-1) reaches this. */
    ROUTING_SKIP_MIN_RATIO: z.coerce.number().min(0).max(1).optional(),
    /** Stage completion requires an evaluation of the current work. Disable only for dev/rollout. */
    REQUIRE_EVALUATION_FOR_PROGRESS: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .optional(),
    /** Number of reverse proxies in front of the API (for correct client IPs in logs). */
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.INTERNAL_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["INTERNAL_API_KEY"],
        message: "INTERNAL_API_KEY is required when NODE_ENV=production",
      });
    }
  });

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  port: number;
  databaseUrl: string;
  corsOrigins: string[];
  internalApiKey?: string;
  adminApiKey?: string;
  logLevel: string;
  trustProxy: number;
  routingSkipMinRatio?: number;
  stageMinScore: number;
  requireEvaluationForProgress: boolean;
  ai: { apiKey?: string; model: string; timeoutMs: number; maxRetries: number };
}

/** Parses and validates environment variables. Throws a readable error when invalid. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  // Docker Compose passes unset optional variables as "" (e.g. ${KEY:-}); treat as unset.
  const cleaned = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== ""),
  );
  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    isProduction: e.NODE_ENV === "production",
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    corsOrigins: csv(e.CORS_ORIGINS),
    internalApiKey: e.INTERNAL_API_KEY,
    adminApiKey: e.ADMIN_API_KEY,
    logLevel: e.LOG_LEVEL ?? (e.NODE_ENV === "test" ? "silent" : "info"),
    trustProxy: e.TRUST_PROXY,
    routingSkipMinRatio: e.ROUTING_SKIP_MIN_RATIO,
    stageMinScore: e.STAGE_MIN_SCORE,
    requireEvaluationForProgress: e.REQUIRE_EVALUATION_FOR_PROGRESS,
    ai: {
      apiKey: e.GEMINI_API_KEY,
      model: e.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
      timeoutMs: e.AI_TIMEOUT_MS,
      maxRetries: e.AI_MAX_RETRIES,
    },
  };
}
