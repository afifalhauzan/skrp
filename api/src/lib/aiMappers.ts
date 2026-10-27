import type {
  AssistanceInteraction,
  CaseEvaluation,
  CriterionScore,
  RoutingDecision,
  StageEvaluation,
  StageId,
} from "@skrp/shared";
import type {
  AssistanceInteraction as DbInteraction,
  CaseEvaluation as DbCaseEvaluation,
  RoutingDecision as DbRouting,
} from "@prisma/client";
import { CRITERION_MAX_SCORE, RUBRIC } from "../config/rubric";
import {
  evaluateStageCompletion,
  type CompletionConfig,
} from "../policies/completion";
import type { EvaluationRow } from "../repositories/aiRepository";

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : [];

export function toStageEvaluation(
  row: EvaluationRow,
  currentHash: string | null,
  completion: CompletionConfig,
): StageEvaluation {
  const labels = new Map(
    RUBRIC[row.stage as StageId].map((c) => [c.key, c.label]),
  );
  const order = RUBRIC[row.stage as StageId].map((c) => c.key);
  const criteria: CriterionScore[] = [...row.criteria]
    .sort(
      (a, b) => order.indexOf(a.criterionKey) - order.indexOf(b.criterionKey),
    )
    .map((c) => ({
      key: c.criterionKey,
      label: labels.get(c.criterionKey) ?? c.criterionKey,
      score: c.score,
      maxScore: c.maxScore || CRITERION_MAX_SCORE,
      evidence: c.evidence,
    }));
  const uncertainty =
    (row.uncertainty as {
      insufficientEvidence: boolean;
      notes: string | null;
    } | null) ?? null;
  const isCurrent = currentHash !== null && currentHash === row.submissionHash;
  return {
    id: row.id,
    caseId: row.caseId,
    stage: row.stage,
    status: row.status,
    attempt: row.attempt,
    rubricVersion: row.rubricVersion,
    artifactRevisionIds: row.artifacts.map((a) => a.artifactRevisionId),
    codeRevision: row.codeRevision?.revisionNumber ?? null,
    submissionHash: row.submissionHash,
    criteria,
    totalScore: row.totalScore,
    maxScore: row.maxScore,
    wentWell: strings(row.wentWell),
    needsImprovement: strings(row.needsImprovement),
    feedback: row.feedback,
    uncertainty,
    completion: evaluateStageCompletion(
      {
        status: row.status,
        isCurrent,
        totalScore: row.totalScore,
        maxScore: row.maxScore,
        insufficientEvidence: uncertainty?.insufficientEvidence ?? false,
      },
      completion,
    ),
    isCurrent,
    failure: row.failureCategory
      ? { category: row.failureCategory, message: row.failureMessage ?? "" }
      : null,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export const toInteraction = (r: DbInteraction): AssistanceInteraction => ({
  id: r.id,
  caseId: r.caseId,
  stage: r.stage,
  level: r.level,
  policyVersion: r.policyVersion,
  trigger: "HINT_REQUEST",
  status: r.status,
  assistanceType: r.assistanceType,
  content: r.content,
  failureCategory: r.failureCategory,
  createdAt: r.createdAt.toISOString(),
});

export const toCaseEvaluation = (
  r: DbCaseEvaluation & { stages: { stageEvaluationId: string }[] },
): CaseEvaluation => ({
  id: r.id,
  caseId: r.caseId,
  status: r.status,
  policyVersion: r.policyVersion,
  summary: r.summary as unknown as CaseEvaluation["summary"],
  stageEvaluationIds: r.stages.map((s) => s.stageEvaluationId),
  createdAt: r.createdAt.toISOString(),
});

export const toRouting = (r: DbRouting): RoutingDecision => ({
  id: r.id,
  currentCaseId: r.currentCaseId,
  nextCaseId: r.nextCaseId,
  skippedCaseIds: r.skippedCaseIds,
  status: r.status,
  reason: r.reason,
  caseEvaluationId: r.caseEvaluationId,
  policyVersion: r.policyVersion,
  provisional: true,
  createdAt: r.createdAt.toISOString(),
});
