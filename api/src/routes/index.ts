import { Router } from "express";
import type { AppConfig } from "../config/env";
import type { AiController } from "../controllers/aiController";
import type { ProgressController } from "../controllers/progressController";
import type { StudentController } from "../controllers/studentController";
import { requireAdminKey, requireInternalKey } from "../middleware/auth";

export function createApiRouter(
  config: Pick<AppConfig, "internalApiKey" | "adminApiKey">,
  students: StudentController,
  progress: ProgressController,
  ai: AiController,
) {
  const router = Router();
  const admin = requireAdminKey(config.adminApiKey);

  router.use(requireInternalKey(config.internalApiKey));

  // Roster administration (admin key required)
  router.get("/students", admin, students.list);
  router.post("/students", admin, students.create);
  router.post("/students/import", admin, students.importRoster);
  router.patch("/students/:studentCode", admin, students.update);

  // Learner-facing
  router.get("/students/:studentCode", students.getProfile);
  router.get("/students/:studentCode/progress", progress.getSnapshot);
  router.put(
    "/students/:studentCode/cases/:caseId/progress",
    progress.saveCaseProgress,
  );
  router.put(
    "/students/:studentCode/cases/:caseId/artifacts/:kind",
    progress.saveArtifact,
  );
  router.post(
    "/students/:studentCode/cases/:caseId/code-revisions",
    progress.saveCodeRevision,
  );

  // AI evaluation, assistance, case-level evaluation + routing
  router.get("/cases", ai.listCases);
  router.post("/students/:studentCode/evaluations/stages", ai.submitStage);
  router.get("/students/:studentCode/evaluations/stages", ai.listStage);
  router.get(
    "/students/:studentCode/evaluations/stages/:evaluationId",
    ai.getStage,
  );
  router.post("/students/:studentCode/evaluations/cases", ai.evaluateCase);
  router.post("/students/:studentCode/assistance/hint", ai.hint);
  router.get("/students/:studentCode/assistance/history", ai.history);

  return router;
}
