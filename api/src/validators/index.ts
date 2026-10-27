import { z } from "zod";
import {
  normalizeStudentCode,
  MAX_ATTENDANCE_NUMBER,
  MIN_ATTENDANCE_NUMBER,
} from "../lib/studentCode";

// ---- path params -----------------------------------------------------------

export const studentCodeParam = z.string().transform((value, ctx) => {
  const code = normalizeStudentCode(value);
  if (!code) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid student code (expected e.g. PY001)",
    });
    return z.NEVER;
  }
  return code;
});

export const caseIdParam = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,39}$/, "Invalid case id");

export const stageIdSchema = z.enum([
  "understand",
  "design",
  "implement",
  "test",
]);
export const artifactKindSchema = z.enum([
  "PROBLEM_SPEC",
  "PSEUDOCODE",
  "REFLECTION",
]);

/** Query/path value for artifact kind, accepted in kebab-case for friendlier URLs. */
export const artifactKindParam = z
  .string()
  .transform((value) => value.toUpperCase().replace(/-/g, "_"))
  .pipe(artifactKindSchema);

// ---- students --------------------------------------------------------------

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable();

const attendanceNumber = z
  .number()
  .int()
  .min(MIN_ATTENDANCE_NUMBER)
  .max(MAX_ATTENDANCE_NUMBER);

export const createStudentBody = z
  .object({
    attendanceNumber,
    name: nullableText(120).optional(),
    className: nullableText(40).optional(),
  })
  .strict();

/** Deliberately has no attendanceNumber/studentCode: codes never change on update. */
export const updateStudentBody = z
  .object({
    name: nullableText(120).optional(),
    className: nullableText(40).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one field to update",
  );

export const importStudentsBody = z
  .object({
    students: z
      .array(
        z
          .object({
            attendanceNumber,
            name: nullableText(120).optional(),
            className: nullableText(40).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.students.map((s) => s.attendanceNumber)).size ===
      value.students.length,
    "Duplicate attendanceNumber in payload",
  );

export const listStudentsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  after: z.coerce.number().int().min(0).default(0),
});

// ---- learning --------------------------------------------------------------

export const saveCaseProgressBody = z
  .object({
    currentStage: stageIdSchema,
    completedStages: z.array(stageIdSchema).max(4),
  })
  .strict();

const problemSpec = z
  .object({
    goal: z.string().max(5000),
    input: z.string().max(5000),
    process: z.string().max(5000),
    output: z.string().max(5000),
    constraints: z.string().max(5000),
  })
  .strict();

export const saveArtifactBody = z
  .object({ content: z.union([problemSpec, z.string().max(20_000)]) })
  .strict();

const executionMetadata = z
  .object({
    status: z.enum(["ok", "error", "timeout", "unavailable"]),
    stdinExhausted: z.boolean(),
    durationMs: z
      .number()
      .min(0)
      .max(10 * 60 * 1000),
    stdout: z.string().max(20_000),
    stderr: z.string().max(20_000),
    traceback: z.string().max(20_000).nullable(),
    executedAt: z.string().datetime(),
    runtime: z.literal("pyodide"),
    runtimeVersion: z.string().max(40).nullable(),
  })
  .strict();

export const saveCodeRevisionBody = z
  .object({
    source: z.string().max(100_000),
    stdin: z.string().max(20_000),
    execution: executionMetadata.nullish(),
  })
  .strict();

export type SaveCodeRevisionBody = z.infer<typeof saveCodeRevisionBody>;
