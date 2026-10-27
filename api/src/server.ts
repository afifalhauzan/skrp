import { createApp } from "./app";
import { loadConfig } from "./config/env";
import { createLogger } from "./lib/logger";
import { createPrismaClient, disconnectPrisma } from "./lib/prisma";

async function main() {
  const config = loadConfig();
  const logger = createLogger(config);
  const prisma = createPrismaClient(config.databaseUrl);

  const app = createApp({ config, logger, prisma });
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, "api listening");
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");
    // Stop accepting connections, let in-flight requests finish, then release the DB.
    const force = setTimeout(() => {
      logger.error("forced exit after shutdown timeout");
      process.exit(1);
    }, 10_000);
    force.unref();
    server.close(async () => {
      await disconnectPrisma(prisma, logger);
      process.exit(0);
    });
    server.closeIdleConnections?.();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "unhandled rejection");
  });
}

main().catch((error) => {
  // Logger may not exist yet (config failure), so write plainly to stderr.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
