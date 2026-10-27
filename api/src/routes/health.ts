import { Router } from "express";
import type { PrismaClient } from "@prisma/client";

export function createHealthRouter(prisma: Pick<PrismaClient, "$queryRaw">) {
  const router = Router();

  // Liveness: the process is up. Never touches the database.
  router.get("/health", (_req, res) => {
    res.json({ status: "ok", uptimeSeconds: Math.round(process.uptime()) });
  });

  // Readiness: the database answers.
  router.get("/health/ready", async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ready", database: "up" });
    } catch (error) {
      req.log?.error({ err: error }, "readiness check failed");
      res.status(503).json({ status: "unavailable", database: "down" });
    }
  });

  return router;
}
