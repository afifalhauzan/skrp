-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssistanceLevel" AS ENUM ('L1', 'L2', 'L3', 'L4', 'L5');

-- CreateEnum
CREATE TYPE "AssistanceStatus" AS ENUM ('GENERATED', 'FALLBACK');

-- CreateEnum
CREATE TYPE "CaseEvaluationStatus" AS ENUM ('COMPLETED', 'INSUFFICIENT_EVIDENCE');

-- CreateEnum
CREATE TYPE "RoutingStatus" AS ENUM ('ADVANCE', 'ADVANCE_WITH_SKIP', 'HOLD_INSUFFICIENT_EVIDENCE', 'JOURNEY_COMPLETE');

-- AlterEnum
ALTER TYPE "CaseStatus" ADD VALUE 'SKIPPED';

-- CreateTable
CREATE TABLE "artifact_revisions" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" "ArtifactKind" NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifact_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_evaluations" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "caseId" TEXT NOT NULL,
    "stage" "StageId" NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "rubricVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "modelName" TEXT,
    "submissionHash" TEXT NOT NULL,
    "codeRevisionId" UUID,
    "clientEvidence" JSONB,
    "totalScore" INTEGER,
    "maxScore" INTEGER NOT NULL,
    "wentWell" JSONB,
    "needsImprovement" JSONB,
    "feedback" TEXT,
    "uncertainty" JSONB,
    "failureCategory" TEXT,
    "failureMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "stage_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criterion_results" (
    "id" UUID NOT NULL,
    "evaluationId" UUID NOT NULL,
    "criterionKey" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "evidence" TEXT NOT NULL,

    CONSTRAINT "criterion_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_artifacts" (
    "evaluationId" UUID NOT NULL,
    "artifactRevisionId" UUID NOT NULL,

    CONSTRAINT "evaluation_artifacts_pkey" PRIMARY KEY ("evaluationId","artifactRevisionId")
);

-- CreateTable
CREATE TABLE "assistance_interactions" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "caseId" TEXT NOT NULL,
    "stage" "StageId" NOT NULL,
    "requestId" TEXT NOT NULL,
    "level" "AssistanceLevel" NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" "AssistanceStatus" NOT NULL,
    "assistanceType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "modelName" TEXT,
    "failureCategory" TEXT,
    "durationMs" INTEGER,
    "activityEvidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistance_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_evaluations" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "caseId" TEXT NOT NULL,
    "status" "CaseEvaluationStatus" NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "evidenceHash" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_evaluation_stages" (
    "caseEvaluationId" UUID NOT NULL,
    "stageEvaluationId" UUID NOT NULL,

    CONSTRAINT "case_evaluation_stages_pkey" PRIMARY KEY ("caseEvaluationId","stageEvaluationId")
);

-- CreateTable
CREATE TABLE "routing_decisions" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "currentCaseId" TEXT NOT NULL,
    "nextCaseId" TEXT,
    "skippedCaseIds" TEXT[],
    "status" "RoutingStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "caseEvaluationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routing_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artifact_revisions_studentId_caseId_kind_revisionNumber_key" ON "artifact_revisions"("studentId", "caseId", "kind", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "artifact_revisions_studentId_caseId_kind_contentHash_key" ON "artifact_revisions"("studentId", "caseId", "kind", "contentHash");

-- CreateIndex
CREATE INDEX "stage_evaluations_studentId_caseId_stage_createdAt_idx" ON "stage_evaluations"("studentId", "caseId", "stage", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "stage_evaluations_studentId_caseId_stage_submissionHash_att_key" ON "stage_evaluations"("studentId", "caseId", "stage", "submissionHash", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "criterion_results_evaluationId_criterionKey_key" ON "criterion_results"("evaluationId", "criterionKey");

-- CreateIndex
CREATE INDEX "assistance_interactions_studentId_caseId_stage_createdAt_idx" ON "assistance_interactions"("studentId", "caseId", "stage", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "assistance_interactions_studentId_requestId_key" ON "assistance_interactions"("studentId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "case_evaluations_studentId_caseId_evidenceHash_policyVersio_key" ON "case_evaluations"("studentId", "caseId", "evidenceHash", "policyVersion");

-- CreateIndex
CREATE INDEX "routing_decisions_studentId_currentCaseId_createdAt_idx" ON "routing_decisions"("studentId", "currentCaseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "routing_decisions_caseEvaluationId_policyVersion_key" ON "routing_decisions"("caseEvaluationId", "policyVersion");

-- AddForeignKey
ALTER TABLE "artifact_revisions" ADD CONSTRAINT "artifact_revisions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_evaluations" ADD CONSTRAINT "stage_evaluations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_evaluations" ADD CONSTRAINT "stage_evaluations_codeRevisionId_fkey" FOREIGN KEY ("codeRevisionId") REFERENCES "code_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criterion_results" ADD CONSTRAINT "criterion_results_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "stage_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_artifacts" ADD CONSTRAINT "evaluation_artifacts_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "stage_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_artifacts" ADD CONSTRAINT "evaluation_artifacts_artifactRevisionId_fkey" FOREIGN KEY ("artifactRevisionId") REFERENCES "artifact_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistance_interactions" ADD CONSTRAINT "assistance_interactions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_evaluations" ADD CONSTRAINT "case_evaluations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_evaluation_stages" ADD CONSTRAINT "case_evaluation_stages_caseEvaluationId_fkey" FOREIGN KEY ("caseEvaluationId") REFERENCES "case_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_evaluation_stages" ADD CONSTRAINT "case_evaluation_stages_stageEvaluationId_fkey" FOREIGN KEY ("stageEvaluationId") REFERENCES "stage_evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_caseEvaluationId_fkey" FOREIGN KEY ("caseEvaluationId") REFERENCES "case_evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

