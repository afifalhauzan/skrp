-- CreateEnum
CREATE TYPE "StageId" AS ENUM ('understand', 'design', 'implement', 'test');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ArtifactKind" AS ENUM ('PROBLEM_SPEC', 'PSEUDOCODE', 'REFLECTION');

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "studentCode" TEXT NOT NULL,
    "name" TEXT,
    "attendanceNumber" INTEGER NOT NULL,
    "className" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_progress" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "caseId" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentStage" "StageId" NOT NULL DEFAULT 'understand',
    "completedStages" "StageId"[],
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_artifacts" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" "ArtifactKind" NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_revisions" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "caseId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "stdin" TEXT NOT NULL DEFAULT '',
    "execution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_studentCode_key" ON "students"("studentCode");

-- CreateIndex
CREATE UNIQUE INDEX "students_attendanceNumber_key" ON "students"("attendanceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "case_progress_studentId_caseId_key" ON "case_progress"("studentId", "caseId");

-- CreateIndex
CREATE UNIQUE INDEX "student_artifacts_studentId_caseId_kind_key" ON "student_artifacts"("studentId", "caseId", "kind");

-- CreateIndex
CREATE INDEX "code_revisions_studentId_caseId_createdAt_idx" ON "code_revisions"("studentId", "caseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "code_revisions_studentId_caseId_revisionNumber_key" ON "code_revisions"("studentId", "caseId", "revisionNumber");

-- AddForeignKey
ALTER TABLE "case_progress" ADD CONSTRAINT "case_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_artifacts" ADD CONSTRAINT "student_artifacts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_revisions" ADD CONSTRAINT "code_revisions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

