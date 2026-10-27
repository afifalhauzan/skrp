/**
 * Case-level aggregation. PROVISIONAL and descriptive: it collects the four stage
 * evaluations into one record. The score ratio is NOT a competence or independence
 * verdict, and no readiness formula is defined here.
 */
import { createHash } from "node:crypto";
import type { StageId } from "@skrp/shared";
import { STAGES } from "../config/cases";

export const CASE_EVALUATION_POLICY_VERSION = "case-evaluation-provisional-v1";

export interface StageEvidence {
  stage: StageId;
  evaluationId: string;
  totalScore: number;
  maxScore: number;
  insufficientEvidence: boolean;
  wentWell: string[];
  needsImprovement: string[];
}

export interface CaseEvaluationResult {
  status: "COMPLETED" | "INSUFFICIENT_EVIDENCE";
  policyVersion: string;
  evidenceHash: string;
  summary: {
    stages: {
      stage: StageId;
      evaluationId: string | null;
      totalScore: number | null;
      maxScore: number;
    }[];
    totalScore: number;
    maxScore: number;
    scoreRatio: number;
    strengths: string[];
    improvements: string[];
    missingStages: StageId[];
  };
  stageEvaluationIds: string[];
}

const unique = (items: string[], limit: number) =>
  [...new Set(items)].slice(0, limit);

export function aggregateCaseEvaluation(
  evidence: StageEvidence[],
  maxScoreByStage: Record<StageId, number>,
): CaseEvaluationResult {
  const byStage = new Map(evidence.map((e) => [e.stage, e]));
  const missingStages = STAGES.filter((s) => !byStage.has(s));
  const weak = STAGES.filter((s) => byStage.get(s)?.insufficientEvidence);

  const stages = STAGES.map((stage) => {
    const e = byStage.get(stage);
    return {
      stage,
      evaluationId: e?.evaluationId ?? null,
      totalScore: e?.totalScore ?? null,
      maxScore: maxScoreByStage[stage],
    };
  });
  const totalScore = stages.reduce((sum, s) => sum + (s.totalScore ?? 0), 0);
  const maxScore = stages.reduce((sum, s) => sum + s.maxScore, 0);
  const ids = evidence.map((e) => e.evaluationId).sort();

  return {
    status:
      missingStages.length === 0 && weak.length === 0
        ? "COMPLETED"
        : "INSUFFICIENT_EVIDENCE",
    policyVersion: CASE_EVALUATION_POLICY_VERSION,
    evidenceHash: createHash("sha256").update(ids.join(",")).digest("hex"),
    summary: {
      stages,
      totalScore,
      maxScore,
      scoreRatio:
        maxScore === 0 ? 0 : Math.round((totalScore / maxScore) * 1000) / 1000,
      strengths: unique(
        evidence.flatMap((e) => e.wentWell),
        6,
      ),
      improvements: unique(
        evidence.flatMap((e) => e.needsImprovement),
        6,
      ),
      missingStages: [
        ...missingStages,
        ...weak.filter((s) => !missingStages.includes(s)),
      ],
    },
    stageEvaluationIds: ids,
  };
}
