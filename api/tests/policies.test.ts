import { describe, expect, it } from "vitest";
import {
  ASSISTANCE_POLICY_VERSION,
  createAssistancePolicy,
  DEFAULT_ASSISTANCE_CONFIG,
} from "../src/policies/assistance";
import {
  aggregateCaseEvaluation,
  type StageEvidence,
} from "../src/policies/caseEvaluation";
import { evaluateStageCompletion } from "../src/policies/completion";
import {
  createRoutingPolicy,
  ROUTING_POLICY_VERSION,
} from "../src/policies/routing";
import { CASE_ORDER, CASES } from "../src/config/cases";
import { RUBRIC, stageMaxScore } from "../src/config/rubric";

describe("assistance policy (micro scaffolding)", () => {
  const policy = createAssistancePolicy();

  it("starts every stage at L1", () => {
    for (const support of ["HIGH", "MODERATE", "LOW"] as const) {
      expect(
        policy.selectLevel({ support, previousGeneratedHints: 0 }).level,
      ).toBe("L1");
    }
  });

  it("escalates one level per configured number of real hints", () => {
    const levels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(
      (n) =>
        policy.selectLevel({ support: "HIGH", previousGeneratedHints: n })
          .level,
    );
    expect(levels).toEqual([
      "L1",
      "L1",
      "L2",
      "L2",
      "L3",
      "L3",
      "L4",
      "L4",
      "L5",
      "L5",
    ]);
  });

  it("never exceeds the cap of the case's macro support, however many hints were given", () => {
    expect(
      policy.selectLevel({ support: "HIGH", previousGeneratedHints: 500 })
        .level,
    ).toBe("L5");
    expect(
      policy.selectLevel({ support: "MODERATE", previousGeneratedHints: 500 })
        .level,
    ).toBe("L4");
    expect(
      policy.selectLevel({ support: "LOW", previousGeneratedHints: 500 }).level,
    ).toBe("L3");
    expect(
      policy.selectLevel({ support: "LOW", previousGeneratedHints: 500 })
        .maxLevel,
    ).toBe("L3");
  });

  it("is configurable and versioned, and ignores elapsed time (no input for it exists)", () => {
    const eager = createAssistancePolicy({
      ...DEFAULT_ASSISTANCE_CONFIG,
      hintsPerLevel: 1,
    });
    expect(
      eager.selectLevel({ support: "HIGH", previousGeneratedHints: 2 }).level,
    ).toBe("L3");
    expect(
      policy.selectLevel({ support: "HIGH", previousGeneratedHints: 0 })
        .policyVersion,
    ).toBe(ASSISTANCE_POLICY_VERSION);
  });
});

describe("stage completion policy", () => {
  const ok = {
    status: "COMPLETED" as const,
    isCurrent: true,
    totalScore: 5,
    maxScore: 40,
    insufficientEvidence: false,
  };

  it("a completed evaluation of the current work satisfies the provisional policy (no threshold yet)", () => {
    expect(evaluateStageCompletion(ok).satisfied).toBe(true);
  });

  it.each([
    ["pending", { ...ok, status: "PENDING" as const }],
    ["failed", { ...ok, status: "FAILED" as const }],
    ["outdated work", { ...ok, isCurrent: false }],
    ["insufficient evidence", { ...ok, insufficientEvidence: true }],
  ])("is not satisfied for %s", (_name, input) => {
    expect(evaluateStageCompletion(input).satisfied).toBe(false);
  });

  it("applies a score threshold only when one is configured", () => {
    expect(evaluateStageCompletion(ok, { minScoreRatio: 0.5 }).satisfied).toBe(
      false,
    );
    expect(
      evaluateStageCompletion({ ...ok, totalScore: 30 }, { minScoreRatio: 0.5 })
        .satisfied,
    ).toBe(true);
  });
});

describe("case configuration and rubric", () => {
  it("has the three cases in HIGH -> MODERATE -> LOW order", () => {
    expect(CASES.map((c) => [c.id, c.support])).toEqual([
      ["case-1", "HIGH"],
      ["case-2", "MODERATE"],
      ["case-3", "LOW"],
    ]);
    expect([...CASE_ORDER]).toEqual(["case-1", "case-2", "case-3"]);
  });

  it("has four indicators per stage with a 0-10 range (max raw 40)", () => {
    for (const stage of [
      "understand",
      "design",
      "implement",
      "test",
    ] as const) {
      expect(RUBRIC[stage]).toHaveLength(4);
      expect(stageMaxScore(stage)).toBe(40);
    }
  });
});

const evidence = (
  stage: StageEvidence["stage"],
  score: number,
  extra: Partial<StageEvidence> = {},
): StageEvidence => ({
  stage,
  evaluationId: `ev-${stage}`,
  totalScore: score,
  maxScore: 40,
  insufficientEvidence: false,
  wentWell: [`ok ${stage}`],
  needsImprovement: [`improve ${stage}`],
  ...extra,
});
const max = { understand: 40, design: 40, implement: 40, test: 40 };

describe("case evaluation", () => {
  const all = [
    evidence("understand", 30),
    evidence("design", 28),
    evidence("implement", 32),
    evidence("test", 20),
  ];

  it("aggregates four stages without claiming competence", () => {
    const r = aggregateCaseEvaluation(all, max);
    expect(r.status).toBe("COMPLETED");
    expect(r.summary.totalScore).toBe(110);
    expect(r.summary.maxScore).toBe(160);
    expect(r.summary.scoreRatio).toBeCloseTo(0.6875);
    expect(r.stageEvaluationIds).toHaveLength(4);
  });

  it("reports insufficient evidence when a stage is missing or flagged uncertain", () => {
    const missing = aggregateCaseEvaluation(all.slice(0, 3), max);
    expect(missing.status).toBe("INSUFFICIENT_EVIDENCE");
    expect(missing.summary.missingStages).toEqual(["test"]);
    const weak = aggregateCaseEvaluation(
      [...all.slice(0, 3), evidence("test", 3, { insufficientEvidence: true })],
      max,
    );
    expect(weak.status).toBe("INSUFFICIENT_EVIDENCE");
  });

  it("is deterministic: same evidence, same hash", () => {
    expect(aggregateCaseEvaluation(all, max).evidenceHash).toBe(
      aggregateCaseEvaluation([...all].reverse(), max).evidenceHash,
    );
  });
});

describe("routing policy (macro scaffolding)", () => {
  const base = {
    caseEvaluationId: "ce-1",
    caseEvaluationStatus: "COMPLETED" as const,
    scoreRatio: 0.9,
  };
  const noSkip = createRoutingPolicy({
    caseOrder: CASE_ORDER,
    skip: { enabled: false, fromCaseId: "case-1", minScoreRatio: null },
  });

  it("follows the configured progression and is deterministic", () => {
    const a = noSkip.decideNextCase({ ...base, currentCaseId: "case-1" });
    expect(a).toMatchObject({
      nextCaseId: "case-2",
      status: "ADVANCE",
      skippedCaseIds: [],
      provisional: true,
      policyVersion: ROUTING_POLICY_VERSION,
    });
    expect(noSkip.decideNextCase({ ...base, currentCaseId: "case-1" })).toEqual(
      a,
    );
    expect(
      noSkip.decideNextCase({ ...base, currentCaseId: "case-2" }).nextCaseId,
    ).toBe("case-3");
  });

  it("ends the journey after the last case", () => {
    expect(
      noSkip.decideNextCase({ ...base, currentCaseId: "case-3" }),
    ).toMatchObject({ nextCaseId: null, status: "JOURNEY_COMPLETE" });
  });

  it("holds when evidence is insufficient, whatever the score", () => {
    const r = noSkip.decideNextCase({
      ...base,
      currentCaseId: "case-1",
      caseEvaluationStatus: "INSUFFICIENT_EVIDENCE",
      scoreRatio: 1,
    });
    expect(r).toMatchObject({
      nextCaseId: null,
      status: "HOLD_INSUFFICIENT_EVIDENCE",
    });
  });

  it("never skips unless explicitly enabled, even for a perfect score", () => {
    expect(
      noSkip.decideNextCase({ ...base, currentCaseId: "case-1", scoreRatio: 1 })
        .skippedCaseIds,
    ).toEqual([]);
  });

  it("skips Case 2 after Case 1 only when configured and the ratio is reached", () => {
    const skip = createRoutingPolicy({
      caseOrder: CASE_ORDER,
      skip: { enabled: true, fromCaseId: "case-1", minScoreRatio: 0.8 },
    });
    expect(
      skip.decideNextCase({
        ...base,
        currentCaseId: "case-1",
        scoreRatio: 0.85,
      }),
    ).toMatchObject({
      status: "ADVANCE_WITH_SKIP",
      nextCaseId: "case-3",
      skippedCaseIds: ["case-2"],
    });
    expect(
      skip.decideNextCase({
        ...base,
        currentCaseId: "case-1",
        scoreRatio: 0.7,
      }),
    ).toMatchObject({ nextCaseId: "case-2", skippedCaseIds: [] });
    // a student who completes Case 2 continues to Case 3
    expect(
      skip.decideNextCase({ ...base, currentCaseId: "case-2", scoreRatio: 1 }),
    ).toMatchObject({ nextCaseId: "case-3", skippedCaseIds: [] });
  });
});
