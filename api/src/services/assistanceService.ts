import type {
  AssistanceHistory,
  AssistanceInteraction,
  HintRequestInput,
  StageId,
} from "@skrp/shared";
import { getCaseConfig, STAGES } from "../config/cases";
import {
  AiError,
  ASSISTANCE_PROMPT_VERSION,
  FALLBACK_HINTS,
  generateHintWithModel,
  type ModelRunner,
} from "../integrations/langchain";
import { toInteraction } from "../lib/aiMappers";
import { invalidState, notFound, rateLimited } from "../lib/errors";
import type { Logger } from "../lib/logger";
import { Prisma } from "../lib/prisma";
import { specText, flowchartText } from "../lib/submission";
import { LEVEL_INTENT, type AssistancePolicy } from "../policies/assistance";
import type { AiRepository } from "../repositories/aiRepository";
import type { ProgressRepository } from "../repositories/progressRepository";
import type { StudentService } from "./studentService";

export interface AssistanceLimits {
  maxPerStage: number;
  minIntervalMs: number;
}
export const DEFAULT_ASSISTANCE_LIMITS: AssistanceLimits = {
  maxPerStage: 15,
  minIntervalMs: 3_000,
};

export class AssistanceService {
  constructor(
    private readonly d: {
      ai: AiRepository;
      progress: ProgressRepository;
      students: StudentService;
      runner: ModelRunner;
      policy: AssistancePolicy;
      logger: Logger;
      limits?: AssistanceLimits;
    },
  ) {}

  private get limits() {
    return this.d.limits ?? DEFAULT_ASSISTANCE_LIMITS;
  }

  async history(
    studentCode: string,
    caseId: string,
    stage: StageId,
  ): Promise<AssistanceHistory> {
    const student = await this.d.students.getActiveStudent(studentCode);
    const caseConfig = getCaseConfig(caseId);
    if (!caseConfig) throw notFound("Kasus tidak ditemukan");
    const [rows, generated] = await Promise.all([
      this.d.ai.listInteractions(student.id, caseId, stage),
      this.d.ai.countInteractions(student.id, caseId, stage, "GENERATED"),
    ]);
    const next = this.d.policy.selectLevel({
      support: caseConfig.support,
      previousGeneratedHints: generated,
    });
    return {
      caseId,
      stage,
      interactions: rows.map(toInteraction).reverse(),
      nextLevel: next.level,
      maxLevel: next.maxLevel,
      policyVersion: next.policyVersion,
    };
  }

  async requestHint(
    studentCode: string,
    input: HintRequestInput,
    log: Logger = this.d.logger,
  ): Promise<{ interaction: AssistanceInteraction; created: boolean }> {
    const student = await this.d.students.getActiveStudent(studentCode);
    const caseConfig = getCaseConfig(input.caseId);
    if (!caseConfig) throw notFound("Kasus tidak ditemukan");

    // Duplicate submission of the same request returns the original interaction.
    const duplicate = await this.d.ai.findInteractionByRequestId(
      student.id,
      input.requestId,
    );
    if (duplicate)
      return { interaction: toInteraction(duplicate), created: false };

    const progress = await this.d.progress.findCaseProgress(
      student.id,
      input.caseId,
    );
    const done = progress?.completedStages ?? [];
    const missing = STAGES.slice(0, STAGES.indexOf(input.stage)).filter(
      (s) => !done.includes(s),
    );
    if (missing.length > 0)
      throw invalidState(`Selesaikan tahap ${missing[0]} lebih dulu.`);

    const last = await this.d.ai.lastInteractionAt(student.id);
    if (
      last &&
      Date.now() - last.createdAt.getTime() < this.limits.minIntervalMs
    ) {
      throw rateLimited("Tunggu sebentar sebelum meminta petunjuk lagi.");
    }
    const [total, generated, recent, sets] = await Promise.all([
      this.d.ai.countInteractions(student.id, input.caseId, input.stage),
      this.d.ai.countInteractions(
        student.id,
        input.caseId,
        input.stage,
        "GENERATED",
      ),
      this.d.ai.listInteractions(student.id, input.caseId, input.stage, 5),
      this.d.ai.loadWorkingSets(student.id, input.caseId),
    ]);
    if (total >= this.limits.maxPerStage)
      throw rateLimited("Batas petunjuk untuk tahap ini sudah tercapai.");

    // The backend picks the level. The model only writes text for it.
    const decision = this.d.policy.selectLevel({
      support: caseConfig.support,
      previousGeneratedHints: generated,
    });
    const ws = sets.get(input.caseId) ?? {};
    const work = [
      ...(ws.spec
        ? [{ label: "Spesifikasi masalah siswa", content: specText(ws.spec) }]
        : []),
      ...(ws.pseudocode
        ? [{ label: "Pseudocode siswa", content: ws.pseudocode }]
        : []),
      ...(flowchartText(ws.flowchart)
        ? [{ label: "Flowchart siswa", content: flowchartText(ws.flowchart) }]
        : []),
      ...(ws.code
        ? [{ label: "Kode Python siswa", content: ws.code.source }]
        : []),
    ];
    const activityEvidence = {
      hintsAlreadyGeneratedInStage: generated,
      requestsInStage: total,
      completedStages: done,
      hasCode: !!ws.code,
      lastRunStatus: ws.code?.execution?.status ?? null,
    };

    const started = Date.now();
    const base = {
      studentId: student.id,
      caseId: input.caseId,
      stage: input.stage,
      requestId: input.requestId,
      level: decision.level,
      policyVersion: decision.policyVersion,
      activityEvidence,
    };
    try {
      let row;
      try {
        const out = await generateHintWithModel(this.d.runner, {
          caseConfig,
          stage: input.stage,
          level: decision.level,
          work,
          previousHints: recent
            .reverse()
            .map((r) => ({ level: r.level, content: r.content })),
        });
        row = await this.d.ai.createInteraction({
          ...base,
          promptVersion: out.promptVersion,
          status: "GENERATED",
          assistanceType: out.assistanceType,
          content: out.hint,
          modelName: out.modelName,
          durationMs: out.durationMs,
        });
        log.info(
          {
            op: "hint",
            interactionId: row.id,
            stage: input.stage,
            level: decision.level,
            status: "GENERATED",
            durationMs: out.durationMs,
          },
          "hint generated",
        );
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) throw error;
        const category =
          error instanceof AiError ? error.category : "UNAVAILABLE";
        // Clearly marked fallback: not a model answer, and it does not escalate the level.
        row = await this.d.ai.createInteraction({
          ...base,
          promptVersion: ASSISTANCE_PROMPT_VERSION,
          status: "FALLBACK",
          assistanceType: LEVEL_INTENT[decision.level].type,
          content: FALLBACK_HINTS[decision.level],
          failureCategory: category,
          modelName: this.d.runner.modelName,
          durationMs: Date.now() - started,
        });
        log.warn(
          {
            op: "hint",
            interactionId: row.id,
            stage: input.stage,
            level: decision.level,
            status: "FALLBACK",
            failureCategory: category,
          },
          "hint fell back",
        );
      }
      return { interaction: toInteraction(row), created: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const winner = await this.d.ai.findInteractionByRequestId(
          student.id,
          input.requestId,
        );
        if (winner)
          return { interaction: toInteraction(winner), created: false };
      }
      throw error;
    }
  }
}
