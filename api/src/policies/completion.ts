/**
 * Stage-completion policy. PROVISIONAL. A successful Gemini response never completes a
 * stage by itself; this application code decides, from the persisted evaluation of the
 * student's CURRENT work. A stage needs at least `minScore` raw points (default 20 of 40);
 * that number is a project decision but is still unvalidated.
 */
export const COMPLETION_POLICY_VERSION = "completion-provisional-v2";

export interface CompletionConfig {
  /** Minimum raw stage score (out of the stage maximum, 40) needed to continue; 0 = no minimum. */
  minScore: number;
}

export const DEFAULT_MIN_STAGE_SCORE = 20;

export const DEFAULT_COMPLETION_CONFIG: CompletionConfig = {
  minScore: DEFAULT_MIN_STAGE_SCORE,
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
  minScore: number;
}

export function evaluateStageCompletion(
  e: CompletionInput,
  config: CompletionConfig = DEFAULT_COMPLETION_CONFIG,
): CompletionDecision {
  const result = (satisfied: boolean, reason: string): CompletionDecision => ({
    policyVersion: COMPLETION_POLICY_VERSION,
    satisfied,
    reason,
    minScore: config.minScore,
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
  if ((e.totalScore ?? 0) < config.minScore) {
    return result(
      false,
      `Skor ${e.totalScore ?? 0}/${e.maxScore} belum mencapai batas minimal ${config.minScore}/${e.maxScore}. Perbaiki pekerjaanmu sesuai umpan balik, lalu periksa ulang.`,
    );
  }
  return result(
    true,
    "Evaluasi pekerjaan terkini selesai dan memenuhi kebijakan sementara.",
  );
}
