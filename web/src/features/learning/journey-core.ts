import type { CaseProgress, RoutingDecision } from "@skrp/shared";
import { stages } from "../../lib/mock-data";
import type { CaseDefinition } from "../../lib/types";

export type JourneyCaseStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";

export interface JourneyCase {
  item: CaseDefinition;
  status: JourneyCaseStatus;
  /** Stages the student has completed in this case (0-4). */
  completedStages: number;
  /** Not reachable yet: it comes after the case the student is currently on. */
  locked: boolean;
}

export interface Journey {
  /** The cases on THIS student's path, in order. Cases the backend skipped are not here. */
  cases: JourneyCase[];
  skippedCaseIds: string[];
  /** Every case on the path has all four stages completed. */
  allStagesDone: boolean;
  /**
   * The journey is over: all stages are done and, with the backend on, its routing policy
   * has confirmed it (JOURNEY_COMPLETE). The client never decides this alone.
   */
  complete: boolean;
  /** First unfinished case on the path, or null when none is left. */
  currentCaseId: string | null;
  lastCaseId: string | null;
}

/**
 * Derives the student's journey from the backend's own records: case progress (status
 * SKIPPED) and routing decisions (skippedCaseIds, JOURNEY_COMPLETE). Pure, so it is
 * testable without React.
 */
export function computeJourney(input: {
  cases: readonly CaseDefinition[];
  progress: (caseId: string) => CaseProgress | undefined;
  routing: (caseId: string) => RoutingDecision | undefined;
  aiEnabled: boolean;
}): Journey {
  const skipped = new Set<string>();
  for (const c of input.cases) {
    if (input.progress(c.id)?.status === "SKIPPED") skipped.add(c.id);
    for (const id of input.routing(c.id)?.skippedCaseIds ?? []) skipped.add(id);
  }

  const path: JourneyCase[] = input.cases
    .filter((c) => !skipped.has(c.id))
    .map((item) => {
      const progress = input.progress(item.id);
      const done = stages.filter((s) =>
        progress?.completedStages.includes(s.id),
      ).length;
      const status: JourneyCaseStatus =
        done === stages.length
          ? "COMPLETED"
          : done > 0 || progress?.status === "IN_PROGRESS"
            ? "IN_PROGRESS"
            : "NOT_STARTED";
      return { item, status, completedStages: done, locked: false };
    });
  // Everything after the first unfinished case is still locked.
  const firstOpen = path.findIndex((c) => c.status !== "COMPLETED");
  if (firstOpen !== -1)
    path.forEach((c, i) => {
      c.locked = i > firstOpen;
    });

  const last = path[path.length - 1];
  const allStagesDone =
    path.length > 0 && path.every((c) => c.status === "COMPLETED");
  const confirmed = input.aiEnabled
    ? !!last && input.routing(last.item.id)?.status === "JOURNEY_COMPLETE"
    : true;
  return {
    cases: path,
    skippedCaseIds: [...skipped],
    allStagesDone,
    complete: allStagesDone && confirmed,
    currentCaseId: path.find((c) => c.status !== "COMPLETED")?.item.id ?? null,
    lastCaseId: last?.item.id ?? null,
  };
}
