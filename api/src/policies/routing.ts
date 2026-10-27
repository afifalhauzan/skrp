/**
 * Macro-scaffolding routing policy. PROVISIONAL and unvalidated: final readiness
 * thresholds have not been specified. The policy is deterministic, receives only
 * persisted evidence, and is independent of Gemini: a model response can never move a
 * student between cases.
 *
 * Default: after a case is completed with sufficient evidence, continue to the next case
 * in the configured order (Case 1 HIGH -> Case 2 MODERATE -> Case 3 LOW). Skipping Case 2
 * after Case 1 is supported but DISABLED until a ratio is configured (ROUTING_SKIP_MIN_RATIO).
 * Not used as evidence: help requests, hint levels, and AI/technical failures.
 */
import type { RoutingStatus } from "@skrp/shared";

export const ROUTING_POLICY_VERSION = "routing-provisional-v1";

export interface RoutingConfig {
  /** Order of cases (macro-support progression). */
  caseOrder: readonly string[];
  skip: { enabled: boolean; fromCaseId: string; minScoreRatio: number | null };
}

export interface RoutingContext {
  currentCaseId: string;
  caseEvaluationStatus: "COMPLETED" | "INSUFFICIENT_EVIDENCE";
  caseEvaluationId: string;
  scoreRatio: number;
  /** Cases already finished or skipped by the student; never routed to again. */
  settledCaseIds?: readonly string[];
}

export interface RoutingResult {
  currentCaseId: string;
  nextCaseId: string | null;
  skippedCaseIds: string[];
  status: RoutingStatus;
  reason: string;
  caseEvaluationId: string;
  policyVersion: string;
  provisional: true;
}

export interface RoutingPolicy {
  decideNextCase(context: RoutingContext): RoutingResult;
}

export function createRoutingPolicy(config: RoutingConfig): RoutingPolicy {
  return {
    decideNextCase(ctx) {
      const base = {
        currentCaseId: ctx.currentCaseId,
        caseEvaluationId: ctx.caseEvaluationId,
        policyVersion: ROUTING_POLICY_VERSION,
        provisional: true as const,
      };
      const index = config.caseOrder.indexOf(ctx.currentCaseId);
      if (index === -1) {
        return {
          ...base,
          nextCaseId: null,
          skippedCaseIds: [],
          status: "HOLD_INSUFFICIENT_EVIDENCE",
          reason: "Kasus tidak dikenal oleh kebijakan routing.",
        };
      }
      if (ctx.caseEvaluationStatus !== "COMPLETED") {
        return {
          ...base,
          nextCaseId: null,
          skippedCaseIds: [],
          status: "HOLD_INSUFFICIENT_EVIDENCE",
          reason:
            "Bukti evaluasi kasus belum cukup; tetap pada kasus ini sampai semua tahap dievaluasi.",
        };
      }
      const next = config.caseOrder[index + 1];
      if (!next) {
        return {
          ...base,
          nextCaseId: null,
          skippedCaseIds: [],
          status: "JOURNEY_COMPLETE",
          reason: "Semua kasus pada urutan telah dilalui.",
        };
      }
      const after = config.caseOrder[index + 2];
      const { enabled, fromCaseId, minScoreRatio } = config.skip;
      if (
        enabled &&
        minScoreRatio !== null &&
        after &&
        ctx.currentCaseId === fromCaseId &&
        ctx.scoreRatio >= minScoreRatio
      ) {
        return {
          ...base,
          nextCaseId: after,
          skippedCaseIds: [next],
          status: "ADVANCE_WITH_SKIP",
          reason: `Rasio skor ${ctx.scoreRatio} memenuhi ambang lompat sementara ${minScoreRatio}; ${next} dicatat sebagai dilewati (SKIPPED).`,
        };
      }
      return {
        ...base,
        nextCaseId: next,
        skippedCaseIds: [],
        status: "ADVANCE",
        reason:
          "Kasus selesai dengan bukti cukup; lanjut ke kasus berikutnya sesuai urutan.",
      };
    },
  };
}
