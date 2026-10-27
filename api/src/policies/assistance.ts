/**
 * Micro-scaffolding policy. PROVISIONAL and unvalidated: it only decides which of the
 * product-defined levels L1-L5 the next hint may use. The model writes the hint text but
 * can never choose or change the level.
 *
 * Default behaviour (conservative): every stage starts at L1; each EXPLICIT hint request
 * that produced a real (non-fallback) hint counts as one step; the level rises one step
 * after `hintsPerLevel` such hints, never above the cap for the case's macro support.
 * Time passing or inactivity never escalates anything.
 */
import type { AssistanceLevel, SupportLevel } from "@skrp/shared";

export const ASSISTANCE_POLICY_VERSION = "assistance-provisional-v1";

export const LEVELS: readonly AssistanceLevel[] = [
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
];

export interface AssistancePolicyConfig {
  hintsPerLevel: number;
  /** Highest level (1-5) a case with this macro support may reach. */
  maxLevelBySupport: Record<SupportLevel, number>;
}

export const DEFAULT_ASSISTANCE_CONFIG: AssistancePolicyConfig = {
  hintsPerLevel: 2,
  maxLevelBySupport: { HIGH: 5, MODERATE: 4, LOW: 3 },
};

export interface AssistanceContext {
  support: SupportLevel;
  /** Real (model-generated) hints already given for this student + case + stage. */
  previousGeneratedHints: number;
}

export interface AssistanceDecision {
  level: AssistanceLevel;
  maxLevel: AssistanceLevel;
  policyVersion: string;
  reason: string;
}

/** Replaceable: later policies (evidence-based escalation or reduction) implement this. */
export interface AssistancePolicy {
  selectLevel(context: AssistanceContext): AssistanceDecision;
}

export function createAssistancePolicy(
  config: AssistancePolicyConfig = DEFAULT_ASSISTANCE_CONFIG,
): AssistancePolicy {
  return {
    selectLevel({ support, previousGeneratedHints }) {
      const cap = Math.min(5, Math.max(1, config.maxLevelBySupport[support]));
      const step = Math.floor(
        previousGeneratedHints / Math.max(1, config.hintsPerLevel),
      );
      const index = Math.min(cap, 1 + step);
      return {
        level: LEVELS[index - 1] as AssistanceLevel,
        maxLevel: LEVELS[cap - 1] as AssistanceLevel,
        policyVersion: ASSISTANCE_POLICY_VERSION,
        reason: `${previousGeneratedHints} hint(s) given in this stage; ${config.hintsPerLevel} per level; cap L${cap} for ${support} support`,
      };
    },
  };
}

/** What each level means; passed to the model as an instruction, not as a choice. */
export const LEVEL_INTENT: Record<
  AssistanceLevel,
  { type: string; instruction: string }
> = {
  L1: {
    type: "prompting-question",
    instruction:
      "Ajukan satu atau dua pertanyaan pemandu yang mendorong siswa berpikir sendiri. Jangan memberi jawaban, rumus, atau kode.",
  },
  L2: {
    type: "conceptual-hint",
    instruction:
      "Berikan petunjuk konseptual yang mengarahkan perhatian siswa ke prinsip atau konsep yang relevan. Jangan memberi langkah rinci atau kode.",
  },
  L3: {
    type: "structured-guidance",
    instruction:
      "Pecah masalah menjadi beberapa langkah kecil yang terstruktur (daftar bernomor). Jangan menulis kode lengkap.",
  },
  L4: {
    type: "partial-example",
    instruction:
      "Berikan contoh sebagian atau kerangka solusi dengan bagian penting yang sengaja dikosongkan untuk dilengkapi siswa. Jangan memberi solusi lengkap.",
  },
  L5: {
    type: "direct-explanation",
    instruction:
      "Berikan penjelasan yang lebih langsung dan eksplisit tentang cara menyelesaikan bagian yang bermasalah, tetap singkat dan mendidik.",
  },
};
