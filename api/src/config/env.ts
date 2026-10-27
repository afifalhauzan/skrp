import { z } from "zod";

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
}

/** Parses and validates environment variables. Throws a readable error when invalid. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.safeParse(env);
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
  };
}
