import { describe, expect, it } from "vitest";
import type {
  CaseProgress,
  CaseStatus,
  RoutingDecision,
  RoutingStatus,
  StageId,
} from "@skrp/shared";
import { computeJourney } from "../src/features/learning/journey-core";
import { cases } from "../src/lib/mock-data";

const ALL: StageId[] = ["understand", "design", "implement", "test"];

const progress = (
  caseId: string,
  completedStages: StageId[],
  status?: CaseStatus,
): CaseProgress => ({
  caseId,
  status:
    status ??
    (completedStages.length === 4
      ? "COMPLETED"
      : completedStages.length
        ? "IN_PROGRESS"
        : "NOT_STARTED"),
  currentStage: "understand",
  completedStages,
  startedAt: null,
  completedAt: null,
  updatedAt: "",
});

const decision = (
  currentCaseId: string,
  status: RoutingStatus,
  over: Partial<RoutingDecision> = {},
): RoutingDecision => ({
  id: "d",
  currentCaseId,
  nextCaseId: null,
  skippedCaseIds: [],
  status,
  reason: "",
  caseEvaluationId: "e",
  policyVersion: "v",
  provisional: true,
  createdAt: "",
  ...over,
});

const journey = (
  p: CaseProgress[],
  r: RoutingDecision[] = [],
  aiEnabled = true,
) =>
  computeJourney({
    cases,
    progress: (id) => p.find((x) => x.caseId === id),
    routing: (id) => r.find((x) => x.currentCaseId === id),
    aiEnabled,
  });

describe("computeJourney: locked cases", () => {
  const locks = (j: ReturnType<typeof journey>) =>
    j.cases.map((c) => [c.item.id, c.locked]);

  it("locks every case after the one the student is on", () => {
    expect(locks(journey([]))).toEqual([
      ["case-1", false],
      ["case-2", true],
      ["case-3", true],
    ]);
  });

  it("opens the next case once the previous one is completed", () => {
    expect(locks(journey([progress("case-1", ALL)]))).toEqual([
      ["case-1", false],
      ["case-2", false],
      ["case-3", true],
    ]);
  });

  it("locks nothing when everything is done", () => {
    const all = cases.map((c) => progress(c.id, ALL));
    expect(journey(all).cases.every((c) => !c.locked)).toBe(true);
  });

  it("skipping a case moves the lock to the right place", () => {
    const j = journey([
      progress("case-1", ALL),
      progress("case-2", [], "SKIPPED"),
    ]);
    expect(locks(j)).toEqual([
      ["case-1", false],
      ["case-3", false],
    ]);
  });
});

describe("computeJourney", () => {
  it("starts locked on the first case", () => {
    const j = journey([]);
    expect(j.cases.map((c) => c.item.id)).toEqual([
      "case-1",
      "case-2",
      "case-3",
    ]);
    expect(j).toMatchObject({
      complete: false,
      allStagesDone: false,
      currentCaseId: "case-1",
    });
  });

  it("reports partial progress per case", () => {
    const j = journey([
      progress("case-1", ALL),
      progress("case-2", ["understand", "design"]),
    ]);
    expect(j.cases.map((c) => [c.status, c.completedStages])).toEqual([
      ["COMPLETED", 4],
      ["IN_PROGRESS", 2],
      ["NOT_STARTED", 0],
    ]);
    expect(j.currentCaseId).toBe("case-2");
  });

  it("without the AI backend, finishing every stage completes the journey", () => {
    const all = cases.map((c) => progress(c.id, ALL));
    expect(journey(all, [], false).complete).toBe(true);
  });

  it("with the AI backend, all stages done is not enough: routing must confirm it", () => {
    const all = cases.map((c) => progress(c.id, ALL));
    const unconfirmed = journey(all);
    expect(unconfirmed).toMatchObject({ allStagesDone: true, complete: false });

    const held = journey(all, [
      decision("case-3", "HOLD_INSUFFICIENT_EVIDENCE"),
    ]);
    expect(held.complete).toBe(false);

    const confirmed = journey(all, [decision("case-3", "JOURNEY_COMPLETE")]);
    expect(confirmed.complete).toBe(true);
  });

  it("hides a case the backend marked SKIPPED and needs only the remaining ones", () => {
    const j = journey(
      [
        progress("case-1", ALL),
        progress("case-2", [], "SKIPPED"),
        progress("case-3", ALL),
      ],
      [decision("case-3", "JOURNEY_COMPLETE")],
    );
    expect(j.cases.map((c) => c.item.id)).toEqual(["case-1", "case-3"]);
    expect(j.skippedCaseIds).toEqual(["case-2"]);
    expect(j.complete).toBe(true);
  });

  it("also hides a case named in a routing decision's skippedCaseIds", () => {
    const j = journey(
      [progress("case-1", ALL)],
      [
        decision("case-1", "ADVANCE_WITH_SKIP", {
          nextCaseId: "case-3",
          skippedCaseIds: ["case-2"],
        }),
      ],
    );
    expect(j.cases.map((c) => c.item.id)).toEqual(["case-1", "case-3"]);
    expect(j.currentCaseId).toBe("case-3");
    expect(j.complete).toBe(false);
  });

  it("a skipped case never counts as completed work", () => {
    const j = journey([
      progress("case-1", ALL),
      progress("case-2", [], "SKIPPED"),
    ]);
    expect(j.cases.some((c) => c.item.id === "case-2")).toBe(false);
    expect(j.allStagesDone).toBe(false); // case-3 is still open
  });
});
