import type {
  CaseProgress,
  CaseStatus,
  CodeRevision,
  Prisma,
  PrismaClient,
  StageId,
  StudentArtifact,
  ArtifactKind,
} from "@prisma/client";

export class ProgressRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listCaseProgress(studentId: string): Promise<CaseProgress[]> {
    return this.prisma.caseProgress.findMany({
      where: { studentId },
      orderBy: { caseId: "asc" },
    });
  }

  findCaseProgress(
    studentId: string,
    caseId: string,
  ): Promise<CaseProgress | null> {
    return this.prisma.caseProgress.findUnique({
      where: { studentId_caseId: { studentId, caseId } },
    });
  }

  upsertCaseProgress(
    studentId: string,
    caseId: string,
    data: {
      status: CaseStatus;
      currentStage: StageId;
      completedStages: StageId[];
      startedAt: Date;
      completedAt: Date | null;
    },
  ): Promise<CaseProgress> {
    return this.prisma.caseProgress.upsert({
      where: { studentId_caseId: { studentId, caseId } },
      create: { studentId, caseId, ...data },
      update: data,
    });
  }

  listArtifacts(studentId: string): Promise<StudentArtifact[]> {
    return this.prisma.studentArtifact.findMany({ where: { studentId } });
  }

  upsertArtifact(
    studentId: string,
    caseId: string,
    kind: ArtifactKind,
    content: Prisma.InputJsonValue,
  ): Promise<StudentArtifact> {
    return this.prisma.studentArtifact.upsert({
      where: { studentId_caseId_kind: { studentId, caseId, kind } },
      create: { studentId, caseId, kind, content },
      update: { content },
    });
  }

  /** Latest revision per case for one student. */
  async latestCodePerCase(studentId: string): Promise<CodeRevision[]> {
    return this.prisma.codeRevision.findMany({
      where: { studentId },
      orderBy: [{ caseId: "asc" }, { revisionNumber: "desc" }],
      distinct: ["caseId"],
    });
  }

  findLatestRevision(
    studentId: string,
    caseId: string,
  ): Promise<CodeRevision | null> {
    return this.prisma.codeRevision.findFirst({
      where: { studentId, caseId },
      orderBy: { revisionNumber: "desc" },
    });
  }

  createRevision(data: {
    studentId: string;
    caseId: string;
    revisionNumber: number;
    source: string;
    stdin: string;
    execution: Prisma.InputJsonValue | null;
  }): Promise<CodeRevision> {
    const { execution, ...rest } = data;
    return this.prisma.codeRevision.create({
      data: { ...rest, ...(execution ? { execution } : {}) },
    });
  }

  setRevisionExecution(
    id: string,
    execution: Prisma.InputJsonValue,
  ): Promise<CodeRevision> {
    return this.prisma.codeRevision.update({
      where: { id },
      data: { execution },
    });
  }
}
