import { PrismaClient } from "@prisma/client";
import type { Logger } from "./logger";

/**
 * The only place a PrismaClient is constructed. The instance is created once at
 * startup (see server.ts) and disconnected during graceful shutdown.
 */
export function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: databaseUrl } } });
}

export async function disconnectPrisma(prisma: PrismaClient, logger: Logger) {
  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.error({ err: error }, "error while disconnecting Prisma");
  }
}

export { Prisma, PrismaClient } from "@prisma/client";
