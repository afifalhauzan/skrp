/**
 * Stage-completion policy. PROVISIONAL. A successful Gemini response never completes a
 * stage by itself; this application code decides, from the persisted evaluation of the
 * student's CURRENT work. No score threshold is defined yet (minScoreRatio = null).
 */
export const COMPLETION_POLICY_VERSION = "completion-provisional-v1";

export interface CompletionConfig {
  /** Minimum totalScore/maxScore to complete a stage, or null for "no threshold yet". */
  minScoreRatio: number | null;
}

export const DEFAULT_COMPLETION_CONFIG: CompletionConfig = {
  minScoreRatio: null,
};

export interface CompletionInput {
  status: "PENDING" | "COMPLETED" | "FAILED";
  isCurrent: boolean;
  totalScore: number | null;
  maxScore: number;
  insufficientEvidence: boolean;
}

export interface CompletionDecision {
  policyVersion: string;
  satisfied: boolean;
  reason: string;
}

export function evaluateStageCompletion(
  e: CompletionInput,
  config: CompletionConfig = DEFAULT_COMPLETION_CONFIG,
): CompletionDecision {
  const result = (satisfied: boolean, reason: string): CompletionDecision => ({
    policyVersion: COMPLETION_POLICY_VERSION,
    satisfied,
    reason,
  });
  if (e.status !== "COMPLETED")
    return result(false, "Evaluasi belum berhasil diselesaikan.");
  if (!e.isCurrent)
    return result(
      false,
      "Pekerjaan berubah setelah evaluasi ini; periksa ulang.",
    );
  if (e.insufficientEvidence)
    return result(false, "Bukti pada pekerjaan belum cukup untuk dinilai.");
  if (
    config.minScoreRatio !== null &&
    (e.totalScore ?? 0) / e.maxScore < config.minScoreRatio
  ) {
    return result(false, "Skor belum memenuhi ambang penyelesaian tahap.");
  }
  return result(
    true,
    "Evaluasi pekerjaan terkini selesai dan memenuhi kebijakan sementara.",
  );
}
