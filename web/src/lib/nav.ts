import { stages } from "./mock-data";
import type { StageId } from "./types";

/** The stage a student should return to: the first unfinished one (the last stage when all are done). */
export function resumeStageFor(completed: readonly string[]): StageId {
  return (
    stages.find((s) => !completed.includes(s.id)) ?? stages[stages.length - 1]
  ).id;
}

/** Brief page URL that remembers where to return to (see `safeBackPath`). */
export function briefHref(caseId: string, from: string, hash = "") {
  return `/mission/${caseId}?from=${encodeURIComponent(from)}${hash}`;
}

const BACK_PATH = /^\/(learn|case-review)\/[a-z0-9-]+(\/[a-z]+)?$/;

/**
 * Validates the `from` query value before it becomes a link target, so the brief page can
 * only send students back to a workspace or review page inside this app.
 */
export function safeBackPath(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v && BACK_PATH.test(v) ? v : null;
}
