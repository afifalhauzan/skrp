import type { Student } from "@prisma/client";
import type {
  StageEvaluation,
  StageId,
  SubmitStageEvaluationInput,
} from "@skrp/shared";
import { getCaseConfig, STAGES } from "../config/cases";
import {
  RUBRIC_VERSION,
  stageMaxScore,
  CRITERION_MAX_SCORE,
} from "../config/rubric";
import {
  AiError,
  EVALUATION_PROMPT_VERSION,
  evaluateStageWithModel,
  type ModelRunner,
} from "../integrations/langchain";
import { toStageEvaluation } from "../lib/aiMappers";
import {
  aiFailure,
  invalidState,
  notFound,
  rateLimited,
  staleArtifact,
} from "../lib/errors";
import type { Logger } from "../lib/logger";
import { Prisma } from "../lib/prisma";
import {
  buildStageSubmission,
  shortRef,
  type StageSubmission,
} from "../lib/submission";
import {
  evaluateStageCompletion,
  type CompletionConfig,
} from "../policies/completion";
import type { AiRepository, EvaluationRow } from "../repositories/aiRepository";
import type { ProgressRepository } from "../repositories/progressRepository";
import type { StudentService } from "./studentService";

export interface EvaluationLimits {
  maxPerHour: number;
  maxAttemptsPerSubmission: number;
  retryCooldownMs: number;
  /** A PENDING row older than this is treated as abandoned (the request died). */
  pendingStaleMs: number;
}

export const DEFAULT_EVALUATION_LIMITS: EvaluationLimits = {
  maxPerHour: 30,
  maxAttemptsPerSubmission: 3,
  retryCooldownMs: 5_000,
  pendingStaleMs: 90_000,
};

export interface EvaluationServiceDeps {
  ai: AiRepository;
  progress: ProgressRepository;
  students: StudentService;
  runner: ModelRunner;
  logger: Logger;
  completion: CompletionConfig;
  /** When false, stage completion does not require a passing evaluation (dev/rollout only). */
  requireEvaluationForProgress: boolean;
  limits?: EvaluationLimits;
}

export class EvaluationService {
  private readonly limits: EvaluationLimits;
  constructor(private readonly d: EvaluationServiceDeps) {
    this.limits = d.limits ?? DEFAULT_EVALUATION_LIMITS;
  }

  /** Stage N is reachable once stages before it are completed. */
  private async assertReachable(
    student: Student,
    caseId: string,
    stage: StageId,
  ) {
    const progress = await this.d.progress.findCaseProgress(student.id, caseId);
    const done = progress?.completedStages ?? [];
    const missing = STAGES.slice(0, STAGES.indexOf(stage)).filter(
      (s) => !done.includes(s),
    );
    if (missing.length > 0)
      throw invalidState(`Selesaikan tahap ${missing[0]} lebih dulu.`);
  }

  private currentHash(
    set: Parameters<typeof buildStageSubmission>[1] | undefined,
    stage: StageId,
  ) {
    const submission = buildStageSubmission(stage, set ?? {});
    return "missing" in submission ? null : submission.hash;
  }

  async submit(
    studentCode: string,
    input: SubmitStageEvaluationInput,
    log: Logger = this.d.logger,
  ): Promise<{ evaluation: StageEvaluation; created: boolean }> {
    const student = await this.d.students.getActiveStudent(studentCode);
    const caseConfig = getCaseConfig(input.caseId);
    if (!caseConfig) throw notFound("Kasus tidak ditemukan");
    await this.assertReachable(student, input.caseId, input.stage);

    // Everything evaluated is read from the database; nothing but the stale-check and the
    // (unverified) test outcomes come from the client.
    const sets = await this.d.ai.loadWorkingSets(student.id, input.caseId);
    const work = sets.get(input.caseId) ?? {};
    const built = buildStageSubmission(input.stage, work);
    if ("missing" in built) throw invalidState(built.missing);
    const submission: StageSubmission = built;

    if (
      input.codeRevision !== undefined &&
      submission.codeRevisionNumber !== null &&
      input.codeRevision !== submission.codeRevisionNumber
    ) {
      throw staleArtifact(
        "Kode berubah sejak dikirim. Simpan ulang lalu periksa lagi.",
      );
    }

    const existing = await this.d.ai.latestEvaluationForSubmission(
      student.id,
      input.caseId,
      input.stage,
      submission.hash,
    );
    let attempt = 1;
    if (existing) {
      if (existing.status === "COMPLETED")
        return {
          evaluation: this.dto(existing, submission.hash),
          created: false,
        };
      const age = Date.now() - existing.createdAt.getTime();
      if (existing.status === "PENDING") {
        if (age < this.limits.pendingStaleMs)
          return {
            evaluation: this.dto(existing, submission.hash),
            created: false,
          };
        await this.d.ai.failEvaluation(
          existing.id,
          "TIMEOUT",
          "Permintaan sebelumnya tidak selesai.",
          age,
        );
      } else {
        const since =
          Date.now() - (existing.completedAt ?? existing.createdAt).getTime();
        if (existing.attempt >= this.limits.maxAttemptsPerSubmission) {
          throw rateLimited(
            "Batas percobaan evaluasi untuk pekerjaan ini tercapai. Ubah pekerjaanmu lalu coba lagi.",
          );
        }
        if (since < this.limits.retryCooldownMs)
          throw rateLimited("Tunggu sebentar sebelum mencoba lagi.");
      }
      attempt = existing.attempt + 1;
    }

    const recent = await this.d.ai.countEvaluationsSince(
      student.id,
      new Date(Date.now() - 3_600_000),
    );
    if (recent >= this.limits.maxPerHour)
      throw rateLimited("Terlalu banyak permintaan evaluasi. Coba lagi nanti.");

    let pending: EvaluationRow;
    try {
      pending = await this.d.ai.createPendingEvaluation({
        studentId: student.id,
        caseId: input.caseId,
        stage: input.stage,
        attempt,
        rubricVersion: RUBRIC_VERSION,
        promptVersion: EVALUATION_PROMPT_VERSION,
        submissionHash: submission.hash,
        codeRevisionId: submission.codeRevisionId,
        clientEvidence: input.testResults
          ? ({
              testResults: input.testResults,
              source: "browser",
            } as unknown as Prisma.InputJsonValue)
          : null,
        maxScore: stageMaxScore(input.stage),
        snapshots: submission.artifactSnapshots,
      });
    } catch (error) {
      // A concurrent identical request won the unique (submission, attempt) slot.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const winner = await this.d.ai.latestEvaluationForSubmission(
          student.id,
          input.caseId,
          input.stage,
          submission.hash,
        );
        if (winner)
          return {
            evaluation: this.dto(winner, submission.hash),
            created: false,
          };
      }
      throw error;
    }

    const started = Date.now();
    const evidence = [
      ...(submission.execution
        ? [
            {
              label: "Hasil menjalankan kode terakhir (dilaporkan browser)",
              content: JSON.stringify({
                status: submission.execution.status,
                stdout: submission.execution.stdout.slice(0, 600),
                traceback:
                  submission.execution.traceback?.slice(0, 600) ?? null,
              }),
            },
          ]
        : []),
      ...(input.stage === "test"
        ? [
            {
              label: "Kasus uji kasus ini (konfigurasi server)",
              content: caseConfig.tests
                .map(
                  (t) =>
                    `${t.id}: input=${JSON.stringify(t.stdin)} harapan=${JSON.stringify(t.expected)}`,
                )
                .join("\n"),
            },
            {
              label: "Hasil uji (dilaporkan browser)",
              content: input.testResults?.length
                ? input.testResults
                    .map(
                      (r) =>
                        `${r.testId}: ${r.passed ? "lulus" : "gagal"}${r.actual ? ` (aktual ${JSON.stringify(r.actual.slice(0, 200))})` : ""}`,
                    )
                    .join("\n")
                : "(tidak ada hasil uji yang dilaporkan)",
            },
          ]
        : []),
    ];

    try {
      const out = await evaluateStageWithModel(this.d.runner, {
        caseConfig,
        stage: input.stage,
        submissionRef: shortRef(submission.hash),
        artifacts: [...submission.work, ...submission.context],
        evidence,
      });
      const criteria = out.result.criteria.map((c) => ({
        ...c,
        maxScore: CRITERION_MAX_SCORE,
      }));
      const row = await this.d.ai.completeEvaluation(pending.id, {
        modelName: out.modelName,
        durationMs: out.durationMs,
        totalScore: criteria.reduce((sum, c) => sum + c.score, 0),
        wentWell: out.result.wentWell,
        needsImprovement: out.result.needsImprovement,
        feedback: out.result.feedback,
        uncertainty: {
          insufficientEvidence: out.result.insufficientEvidence,
          notes: out.result.uncertaintyNotes,
        },
        criteria,
      });
      log.info(
        {
          op: "stage_evaluation",
          evaluationId: row.id,
          stage: input.stage,
          caseId: input.caseId,
          attempt,
          status: "COMPLETED",
          durationMs: out.durationMs,
        },
        "stage evaluation completed",
      );
      return { evaluation: this.dto(row, submission.hash), created: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) throw error;
      const category =
        error instanceof AiError ? error.category : "UNAVAILABLE";
      const message =
        error instanceof AiError ? error.message : "Layanan AI gagal.";
      await this.d.ai.failEvaluation(
        pending.id,
        category,
        message,
        Date.now() - started,
        this.d.runner.modelName,
      );
      log.warn(
        {
          op: "stage_evaluation",
          evaluationId: pending.id,
          stage: input.stage,
          caseId: input.caseId,
          attempt,
          status: "FAILED",
          failureCategory: category,
          durationMs: Date.now() - started,
        },
        "stage evaluation failed",
      );
      throw aiFailure(category, message, { evaluationId: pending.id });
    }
  }

  async get(
    studentCode: string,
    evaluationId: string,
  ): Promise<StageEvaluation> {
    const student = await this.d.students.getActiveStudent(studentCode);
    const row = await this.d.ai.getEvaluation(student.id, evaluationId);
    if (!row) throw notFound("Evaluasi tidak ditemukan");
    const sets = await this.d.ai.loadWorkingSets(student.id, row.caseId);
    return this.dto(row, this.currentHash(sets.get(row.caseId), row.stage));
  }

  async list(
    studentCode: string,
    caseId: string,
    stage?: StageId,
  ): Promise<StageEvaluation[]> {
    const student = await this.d.students.getActiveStudent(studentCode);
    const rows = await this.d.ai.listEvaluations(student.id, caseId, stage);
    const sets = await this.d.ai.loadWorkingSets(student.id, caseId);
    return rows.map((r) =>
      this.dto(r, this.currentHash(sets.get(caseId), r.stage)),
    );
  }

  /** Latest evaluation per case + stage, for the progress snapshot. */
  async latestForSnapshot(studentId: string): Promise<StageEvaluation[]> {
    const [rows, sets] = await Promise.all([
      this.d.ai.latestPerStage(studentId),
      this.d.ai.loadWorkingSets(studentId),
    ]);
    return rows.map((r) =>
      this.dto(r, this.currentHash(sets.get(r.caseId), r.stage)),
    );
  }

  /**
   * Called when the client asks to mark stages complete. Completion is decided by the
   * completion policy over the persisted evaluation of the CURRENT work, never by the
   * client and never by "the model said so".
   */
  async assertCompletable(student: Student, caseId: string, stages: StageId[]) {
    if (!this.d.requireEvaluationForProgress || stages.length === 0) return;
    const sets = await this.d.ai.loadWorkingSets(student.id, caseId);
    for (const stage of stages) {
      const hash = this.currentHash(sets.get(caseId), stage);
      const rows = hash
        ? await this.d.ai.listEvaluations(student.id, caseId, stage)
        : [];
      const match = rows.find(
        (r) => r.status === "COMPLETED" && r.submissionHash === hash,
      );
      const decision = match
        ? evaluateStageCompletion(
            {
              status: match.status,
              isCurrent: true,
              totalScore: match.totalScore,
              maxScore: match.maxScore,
              insufficientEvidence:
                (match.uncertainty as { insufficientEvidence?: boolean } | null)
                  ?.insufficientEvidence ?? false,
            },
            this.d.completion,
          )
        : null;
      if (!decision?.satisfied) {
        throw invalidState(
          decision?.reason ??
            "Tahap ini belum dievaluasi untuk pekerjaan terkini. Tekan “Periksa jawaban” dulu.",
        );
      }
    }
  }

  private dto(row: EvaluationRow, currentHash: string | null) {
    return toStageEvaluation(row, currentHash, this.d.completion);
  }
}
