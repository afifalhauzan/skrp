import type {
  ArtifactKind,
  AssistanceLevel,
  AssistanceStatus,
  CaseEvaluationStatus,
  Prisma,
  PrismaClient,
  RoutingStatus,
  StageId,
} from "@prisma/client";
import type { ExecutionMetadata, ProblemSpec } from "@skrp/shared";
import type { WorkingSet } from "../lib/submission";

export const evaluationInclude = {
  criteria: true,
  artifacts: true,
  codeRevision: { select: { revisionNumber: true } },
} satisfies Prisma.StageEvaluationInclude;

export type EvaluationRow = Prisma.StageEvaluationGetPayload<{
  include: typeof evaluationInclude;
}>;

export class AiRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ---- the student's current work ------------------------------------------
  async loadWorkingSets(
    studentId: string,
    caseId?: string,
  ): Promise<Map<string, WorkingSet>> {
    const [artifacts, code] = await Promise.all([
      this.prisma.studentArtifact.findMany({
        where: { studentId, ...(caseId ? { caseId } : {}) },
      }),
      this.prisma.codeRevision.findMany({
        where: { studentId, ...(caseId ? { caseId } : {}) },
        orderBy: [{ caseId: "asc" }, { revisionNumber: "desc" }],
        distinct: ["caseId"],
      }),
    ]);
    const sets = new Map<string, WorkingSet>();
    const of = (id: string) => sets.get(id) ?? sets.set(id, {}).get(id)!;
    for (const a of artifacts) {
      const set = of(a.caseId);
      if (a.kind === "PROBLEM_SPEC")
        set.spec = a.content as unknown as ProblemSpec;
      else if (a.kind === "PSEUDOCODE") set.pseudocode = a.content as string;
      else if (a.kind === "FLOWCHART") set.flowchart = a.content as string;
    }
    for (const r of code) {
      of(r.caseId).code = {
        id: r.id,
        revisionNumber: r.revisionNumber,
        source: r.source,
        stdin: r.stdin,
        execution: r.execution as ExecutionMetadata | null,
      };
    }
    return sets;
  }

  // ---- stage evaluations -----------------------------------------------------
  latestEvaluationForSubmission(
    studentId: string,
    caseId: string,
    stage: StageId,
    submissionHash: string,
  ) {
    return this.prisma.stageEvaluation.findFirst({
      where: { studentId, caseId, stage, submissionHash },
      orderBy: { attempt: "desc" },
      include: evaluationInclude,
    });
  }

  countEvaluationsSince(studentId: string, since: Date) {
    return this.prisma.stageEvaluation.count({
      where: { studentId, createdAt: { gte: since } },
    });
  }

  getEvaluation(studentId: string, id: string) {
    return this.prisma.stageEvaluation.findFirst({
      where: { id, studentId },
      include: evaluationInclude,
    });
  }

  listEvaluations(studentId: string, caseId: string, stage?: StageId) {
    return this.prisma.stageEvaluation.findMany({
      where: { studentId, caseId, ...(stage ? { stage } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: evaluationInclude,
    });
  }

  /** Latest evaluation per case + stage, any status. */
  async latestPerStage(studentId: string) {
    const rows = await this.prisma.stageEvaluation.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      include: evaluationInclude,
    });
    const seen = new Set<string>();
    return rows.filter((r) => {
      const key = `${r.caseId}:${r.stage}`;
      return seen.has(key) ? false : (seen.add(key), true);
    });
  }

  /** Latest COMPLETED evaluation per stage of one case. */
  async latestCompletedPerStage(studentId: string, caseId: string) {
    const rows = await this.prisma.stageEvaluation.findMany({
      where: { studentId, caseId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      include: evaluationInclude,
    });
    const seen = new Set<string>();
    return rows.filter((r) =>
      seen.has(r.stage) ? false : (seen.add(r.stage), true),
    );
  }

  /** Creates the snapshots and the PENDING row in one short transaction (no model call inside). */
  createPendingEvaluation(args: {
    studentId: string;
    caseId: string;
    stage: StageId;
    attempt: number;
    rubricVersion: string;
    promptVersion: string;
    submissionHash: string;
    codeRevisionId: string | null;
    clientEvidence: Prisma.InputJsonValue | null;
    maxScore: number;
    snapshots: { kind: ArtifactKind; content: unknown; hash: string }[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const revisionIds: string[] = [];
      for (const snap of args.snapshots) {
        const existing = await tx.artifactRevision.findUnique({
          where: {
            studentId_caseId_kind_contentHash: {
              studentId: args.studentId,
              caseId: args.caseId,
              kind: snap.kind,
              contentHash: snap.hash,
            },
          },
        });
        if (existing) {
          revisionIds.push(existing.id);
          continue;
        }
        const last = await tx.artifactRevision.findFirst({
          where: {
            studentId: args.studentId,
            caseId: args.caseId,
            kind: snap.kind,
          },
          orderBy: { revisionNumber: "desc" },
        });
        const created = await tx.artifactRevision.create({
          data: {
            studentId: args.studentId,
            caseId: args.caseId,
            kind: snap.kind,
            revisionNumber: (last?.revisionNumber ?? 0) + 1,
            content: snap.content as Prisma.InputJsonValue,
            contentHash: snap.hash,
          },
        });
        revisionIds.push(created.id);
      }
      return tx.stageEvaluation.create({
        data: {
          studentId: args.studentId,
          caseId: args.caseId,
          stage: args.stage,
          attempt: args.attempt,
          rubricVersion: args.rubricVersion,
          promptVersion: args.promptVersion,
          submissionHash: args.submissionHash,
          codeRevisionId: args.codeRevisionId,
          maxScore: args.maxScore,
          ...(args.clientEvidence
            ? { clientEvidence: args.clientEvidence }
            : {}),
          artifacts: {
            create: revisionIds.map((artifactRevisionId) => ({
              artifactRevisionId,
            })),
          },
        },
        include: evaluationInclude,
      });
    });
  }

  completeEvaluation(
    id: string,
    data: {
      modelName: string;
      durationMs: number;
      totalScore: number;
      wentWell: string[];
      needsImprovement: string[];
      feedback: string;
      uncertainty: { insufficientEvidence: boolean; notes: string | null };
      criteria: {
        key: string;
        score: number;
        maxScore: number;
        evidence: string;
      }[];
    },
  ) {
    return this.prisma.stageEvaluation.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        modelName: data.modelName,
        durationMs: data.durationMs,
        totalScore: data.totalScore,
        wentWell: data.wentWell,
        needsImprovement: data.needsImprovement,
        feedback: data.feedback,
        uncertainty: data.uncertainty,
        criteria: {
          create: data.criteria.map((c) => ({
            criterionKey: c.key,
            score: c.score,
            maxScore: c.maxScore,
            evidence: c.evidence,
          })),
        },
      },
      include: evaluationInclude,
    });
  }

  failEvaluation(
    id: string,
    category: string,
    message: string,
    durationMs: number,
    modelName?: string,
  ) {
    return this.prisma.stageEvaluation.update({
      where: { id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        failureCategory: category,
        failureMessage: message,
        durationMs,
        ...(modelName ? { modelName } : {}),
      },
      include: evaluationInclude,
    });
  }

  // ---- assistance ------------------------------------------------------------
  findInteractionByRequestId(studentId: string, requestId: string) {
    return this.prisma.assistanceInteraction.findUnique({
      where: { studentId_requestId: { studentId, requestId } },
    });
  }

  listInteractions(
    studentId: string,
    caseId: string,
    stage: StageId,
    take = 30,
  ) {
    return this.prisma.assistanceInteraction.findMany({
      where: { studentId, caseId, stage },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  countInteractions(
    studentId: string,
    caseId: string,
    stage: StageId,
    status?: AssistanceStatus,
  ) {
    return this.prisma.assistanceInteraction.count({
      where: { studentId, caseId, stage, ...(status ? { status } : {}) },
    });
  }

  lastInteractionAt(studentId: string) {
    return this.prisma.assistanceInteraction.findFirst({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
  }

  createInteraction(data: {
    studentId: string;
    caseId: string;
    stage: StageId;
    requestId: string;
    level: AssistanceLevel;
    policyVersion: string;
    promptVersion: string;
    status: AssistanceStatus;
    assistanceType: string;
    content: string;
    modelName?: string;
    failureCategory?: string;
    durationMs?: number;
    activityEvidence?: Prisma.InputJsonValue;
  }) {
    return this.prisma.assistanceInteraction.create({
      data: { trigger: "HINT_REQUEST", ...data },
    });
  }

  // ---- case evaluation + routing --------------------------------------------
  /** Idempotent on (student, case, evidence, policy): same evidence yields the same record. */
  async upsertCaseEvaluation(data: {
    studentId: string;
    caseId: string;
    status: CaseEvaluationStatus;
    policyVersion: string;
    evidenceHash: string;
    summary: Prisma.InputJsonValue;
    stageEvaluationIds: string[];
  }) {
    const where = {
      studentId_caseId_evidenceHash_policyVersion: {
        studentId: data.studentId,
        caseId: data.caseId,
        evidenceHash: data.evidenceHash,
        policyVersion: data.policyVersion,
      },
    };
    const existing = await this.prisma.caseEvaluation.findUnique({
      where,
      include: { stages: true },
    });
    if (existing) return existing;
    return this.prisma.caseEvaluation.create({
      data: {
        studentId: data.studentId,
        caseId: data.caseId,
        status: data.status,
        policyVersion: data.policyVersion,
        evidenceHash: data.evidenceHash,
        summary: data.summary,
        stages: {
          create: data.stageEvaluationIds.map((stageEvaluationId) => ({
            stageEvaluationId,
          })),
        },
      },
      include: { stages: true },
    });
  }

  findDecision(caseEvaluationId: string, policyVersion: string) {
    return this.prisma.routingDecision.findUnique({
      where: {
        caseEvaluationId_policyVersion: { caseEvaluationId, policyVersion },
      },
    });
  }

  /** Decision + SKIPPED markers commit together; a skip never overwrites a COMPLETED case. */
  createRoutingDecision(data: {
    studentId: string;
    currentCaseId: string;
    nextCaseId: string | null;
    skippedCaseIds: string[];
    status: RoutingStatus;
    reason: string;
    policyVersion: string;
    caseEvaluationId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      for (const caseId of data.skippedCaseIds) {
        const existing = await tx.caseProgress.findUnique({
          where: { studentId_caseId: { studentId: data.studentId, caseId } },
        });
        if (existing?.status === "COMPLETED") continue;
        await tx.caseProgress.upsert({
          where: { studentId_caseId: { studentId: data.studentId, caseId } },
          create: { studentId: data.studentId, caseId, status: "SKIPPED" },
          update: { status: "SKIPPED" },
        });
      }
      return tx.routingDecision.create({ data });
    });
  }

  latestDecisions(studentId: string) {
    return this.prisma.routingDecision
      .findMany({ where: { studentId }, orderBy: { createdAt: "desc" } })
      .then((rows) => {
        const seen = new Set<string>();
        return rows.filter((r) =>
          seen.has(r.currentCaseId) ? false : (seen.add(r.currentCaseId), true),
        );
      });
  }
}
