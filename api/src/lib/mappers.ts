import type {
  Artifact,
  CaseProgress,
  CodeRevision,
  ExecutionMetadata,
  ProblemSpec,
  StudentProfile,
  StudentRecord,
} from "@skrp/shared";
import type {
  CaseProgress as DbCaseProgress,
  CodeRevision as DbCodeRevision,
  Student as DbStudent,
  StudentArtifact as DbArtifact,
} from "@prisma/client";

export const toProfile = (s: DbStudent): StudentProfile => ({
  studentCode: s.studentCode,
  name: s.name,
  className: s.className,
});

export const toRecord = (s: DbStudent): StudentRecord => ({
  ...toProfile(s),
  id: s.id,
  attendanceNumber: s.attendanceNumber,
  isActive: s.isActive,
  createdAt: s.createdAt.toISOString(),
  updatedAt: s.updatedAt.toISOString(),
});

export const toCaseProgress = (p: DbCaseProgress): CaseProgress => ({
  caseId: p.caseId,
  status: p.status,
  currentStage: p.currentStage,
  completedStages: p.completedStages,
  startedAt: p.startedAt?.toISOString() ?? null,
  completedAt: p.completedAt?.toISOString() ?? null,
  updatedAt: p.updatedAt.toISOString(),
});

export const toArtifact = (a: DbArtifact): Artifact => ({
  caseId: a.caseId,
  kind: a.kind,
  content: a.content as ProblemSpec | string,
  updatedAt: a.updatedAt.toISOString(),
});

export const toCodeRevision = (r: DbCodeRevision): CodeRevision => ({
  caseId: r.caseId,
  revision: r.revisionNumber,
  source: r.source,
  stdin: r.stdin,
  execution: (r.execution as ExecutionMetadata | null) ?? null,
  createdAt: r.createdAt.toISOString(),
});
