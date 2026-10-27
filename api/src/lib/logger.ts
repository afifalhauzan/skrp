import pino from "pino";
import type { AppConfig } from "../config/env";

export function createLogger(config: Pick<AppConfig, "logLevel">) {
  return pino({
    level: config.logLevel,
    redact: {
      paths: [
        "req.headers.authorization",
        'req.headers["x-internal-key"]',
        'req.headers["x-admin-key"]',
        "req.headers.cookie",
      ],
      censor: "[redacted]",
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
