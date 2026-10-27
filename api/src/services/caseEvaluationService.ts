import type { CaseEvaluation, RoutingDecision, StageId } from "@skrp/shared";
import type { Prisma } from "@prisma/client";
import { getCaseConfig } from "../config/cases";
import { stageMaxScore } from "../config/rubric";
import { toCaseEvaluation, toRouting } from "../lib/aiMappers";
import { notFound } from "../lib/errors";
import {
  aggregateCaseEvaluation,
  type StageEvidence,
} from "../policies/caseEvaluation";
import type { RoutingPolicy } from "../policies/routing";
import { ROUTING_POLICY_VERSION } from "../policies/routing";
import type { AiRepository } from "../repositories/aiRepository";
import type { StudentService } from "./studentService";

const MAX_BY_STAGE = {
  understand: stageMaxScore("understand"),
  design: stageMaxScore("design"),
  implement: stageMaxScore("implement"),
  test: stageMaxScore("test"),
} satisfies Record<StageId, number>;

/**
 * Aggregates persisted stage evaluations (no model call) and asks the routing policy
 * what comes next. Everything here is deterministic given the stored evidence.
 */
export class CaseEvaluationService {
  constructor(
    private readonly d: {
      ai: AiRepository;
      students: StudentService;
      routing: RoutingPolicy;
    },
  ) {}

  async evaluateCase(
    studentCode: string,
    caseId: string,
  ): Promise<{ caseEvaluation: CaseEvaluation; routing: RoutingDecision }> {
    const student = await this.d.students.getActiveStudent(studentCode);
    if (!getCaseConfig(caseId)) throw notFound("Kasus tidak ditemukan");

    const rows = await this.d.ai.latestCompletedPerStage(student.id, caseId);
    const evidence: StageEvidence[] = rows.map((r) => ({
      stage: r.stage,
      evaluationId: r.id,
      totalScore: r.totalScore ?? 0,
      maxScore: r.maxScore,
      insufficientEvidence:
        (r.uncertainty as { insufficientEvidence?: boolean } | null)
          ?.insufficientEvidence ?? false,
      wentWell: Array.isArray(r.wentWell) ? (r.wentWell as string[]) : [],
      needsImprovement: Array.isArray(r.needsImprovement)
        ? (r.needsImprovement as string[])
        : [],
    }));
    const result = aggregateCaseEvaluation(evidence, MAX_BY_STAGE);

    const caseEval = await this.d.ai.upsertCaseEvaluation({
      studentId: student.id,
      caseId,
      status: result.status,
      policyVersion: result.policyVersion,
      evidenceHash: result.evidenceHash,
      summary: result.summary as unknown as Prisma.InputJsonValue,
      stageEvaluationIds: result.stageEvaluationIds,
    });

    let decision = await this.d.ai.findDecision(
      caseEval.id,
      ROUTING_POLICY_VERSION,
    );
    if (!decision) {
      const outcome = this.d.routing.decideNextCase({
        currentCaseId: caseId,
        caseEvaluationStatus: result.status,
        caseEvaluationId: caseEval.id,
        scoreRatio: result.summary.scoreRatio,
      });
      decision = await this.d.ai.createRoutingDecision({
        studentId: student.id,
        currentCaseId: outcome.currentCaseId,
        nextCaseId: outcome.nextCaseId,
        skippedCaseIds: outcome.skippedCaseIds,
        status: outcome.status,
        reason: outcome.reason,
        policyVersion: outcome.policyVersion,
        caseEvaluationId: caseEval.id,
      });
    }
    return {
      caseEvaluation: toCaseEvaluation(caseEval),
      routing: toRouting(decision),
    };
  }
}
