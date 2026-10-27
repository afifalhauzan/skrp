import type {
  ArtifactKind,
  Artifact,
  CaseProgress,
  ProgressSnapshot,
  SaveCaseProgressInput,
  SaveCodeRevisionResult,
} from "@skrp/shared";
import type { Prisma } from "@prisma/client";
import { Prisma as PrismaNs } from "../lib/prisma";
import { badRequest, conflict } from "../lib/errors";
import {
  toArtifact,
  toCaseProgress,
  toCodeRevision,
  toProfile,
} from "../lib/mappers";
import type { ProgressRepository } from "../repositories/progressRepository";
import type { SaveCodeRevisionBody } from "../validators";
import type { StudentService } from "./studentService";

const ALL_STAGES = ["understand", "design", "implement", "test"] as const;
/** Reflection is the one artifact that belongs to the journey, not a case. */
export const JOURNEY_CASE_ID = "journey";

export class ProgressService {
  constructor(
    private readonly students: StudentService,
    private readonly progress: ProgressRepository,
  ) {}

  async getSnapshot(studentCode: string): Promise<ProgressSnapshot> {
    const student = await this.students.getActiveStudent(studentCode);
    const [cases, artifacts, latestCode] = await Promise.all([
      this.progress.listCaseProgress(student.id),
      this.progress.listArtifacts(student.id),
      this.progress.latestCodePerCase(student.id),
    ]);
    return {
      student: toProfile(student),
      cases: cases.map(toCaseProgress),
      artifacts: artifacts.map(toArtifact),
      latestCode: latestCode.map(toCodeRevision),
    };
  }

  async saveCaseProgress(
    studentCode: string,
    caseId: string,
    input: SaveCaseProgressInput,
  ): Promise<CaseProgress> {
    if (caseId === JOURNEY_CASE_ID)
      throw badRequest(`"${JOURNEY_CASE_ID}" is not a case`);
    const student = await this.students.getActiveStudent(studentCode);
    const existing = await this.progress.findCaseProgress(student.id, caseId);

    const completedStages = ALL_STAGES.filter((stage) =>
      input.completedStages.includes(stage),
    );
    const allDone = completedStages.length === ALL_STAGES.length;
    const now = new Date();

    const saved = await this.progress.upsertCaseProgress(student.id, caseId, {
      status: allDone ? "COMPLETED" : "IN_PROGRESS",
      currentStage: input.currentStage,
      completedStages,
      startedAt: existing?.startedAt ?? now,
      completedAt: allDone ? (existing?.completedAt ?? now) : null,
    });
    return toCaseProgress(saved);
  }

  async saveArtifact(
    studentCode: string,
    caseId: string,
    kind: ArtifactKind,
    content: Artifact["content"],
  ): Promise<Artifact> {
    const isReflection = kind === "REFLECTION";
    if (isReflection !== (caseId === JOURNEY_CASE_ID)) {
      throw badRequest(
        `REFLECTION artifacts use caseId "${JOURNEY_CASE_ID}" and nothing else does`,
      );
    }
    if ((kind === "PROBLEM_SPEC") !== (typeof content === "object")) {
      throw badRequest(
        kind === "PROBLEM_SPEC"
          ? "PROBLEM_SPEC content must be an object"
          : `${kind} content must be a string`,
      );
    }
    const student = await this.students.getActiveStudent(studentCode);
    const saved = await this.progress.upsertArtifact(
      student.id,
      caseId,
      kind,
      content as Prisma.InputJsonValue,
    );
    return toArtifact(saved);
  }

  /**
   * Append-only code history. An identical source+stdin as the latest revision does
   * not create a new row (autosave is idempotent); it can only attach run metadata.
   */
  async saveCodeRevision(
    studentCode: string,
    caseId: string,
    input: SaveCodeRevisionBody,
  ): Promise<SaveCodeRevisionResult> {
    if (caseId === JOURNEY_CASE_ID)
      throw badRequest(`"${JOURNEY_CASE_ID}" is not a case`);
    const student = await this.students.getActiveStudent(studentCode);
    const execution = (input.execution ?? null) as Prisma.InputJsonValue | null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const latest = await this.progress.findLatestRevision(student.id, caseId);
      if (
        latest &&
        latest.source === input.source &&
        latest.stdin === input.stdin
      ) {
        if (execution) {
          const updated = await this.progress.setRevisionExecution(
            latest.id,
            execution,
          );
          return { revision: toCodeRevision(updated), created: false };
        }
        return { revision: toCodeRevision(latest), created: false };
      }
      try {
        const created = await this.progress.createRevision({
          studentId: student.id,
          caseId,
          revisionNumber: (latest?.revisionNumber ?? 0) + 1,
          source: input.source,
          stdin: input.stdin,
          execution,
        });
        return { revision: toCodeRevision(created), created: true };
      } catch (error) {
        // Two saves raced for the same revision number: re-read and try again.
        const raced =
          error instanceof PrismaNs.PrismaClientKnownRequestError &&
          error.code === "P2002";
        if (!raced) throw error;
      }
    }
    throw conflict(
      "Could not save code revision because of concurrent saves, please retry",
    );
  }
}
