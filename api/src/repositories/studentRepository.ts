import { Prisma, type PrismaClient, type Student } from "@prisma/client";
import { generatePasscode } from "../lib/passcode";
import { formatStudentCode } from "../lib/studentCode";

const PASSCODE_ATTEMPTS = 8;

function isPasscodeCollision(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  )
    return false;
  const target = error.meta?.target;
  return Array.isArray(target)
    ? target.includes("passcode")
    : String(target ?? "").includes("passcode");
}

/** Runs `write` with a fresh passcode, retrying only when that passcode is already taken. */
export async function withFreshPasscode<T>(
  write: (passcode: string) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await write(generatePasscode());
    } catch (error) {
      if (!isPasscodeCollision(error) || attempt >= PASSCODE_ATTEMPTS)
        throw error;
    }
  }
}

export interface StudentFields {
  name?: string | null;
  className?: string | null;
}

export class StudentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByCode(studentCode: string): Promise<Student | null> {
    return this.prisma.student.findUnique({ where: { studentCode } });
  }

  list(limit: number, afterCode: string): Promise<Student[]> {
    return this.prisma.student.findMany({
      where: afterCode ? { studentCode: { gt: afterCode } } : {},
      orderBy: { studentCode: "asc" },
      take: limit,
    });
  }

  /**
   * Relies on the unique constraints on attendanceNumber and studentCode, so two
   * concurrent creates for the same number cannot both succeed (one gets P2002).
   */
  create(attendanceNumber: number, fields: StudentFields): Promise<Student> {
    return withFreshPasscode((passcode) =>
      this.prisma.student.create({
        data: {
          attendanceNumber,
          studentCode: formatStudentCode(attendanceNumber),
          name: fields.name ?? null,
          className: fields.className ?? null,
          passcode,
        },
      }),
    );
  }

  /**
   * Idempotent: the code and passcode are only ever set on insert, never rewritten on
   * update, so re-importing a roster never changes what a student has already been given.
   */
  upsertByAttendance(
    attendanceNumber: number,
    fields: StudentFields,
  ): Promise<Student> {
    return withFreshPasscode((passcode) =>
      this.prisma.student.upsert({
        where: { attendanceNumber },
        create: {
          attendanceNumber,
          studentCode: formatStudentCode(attendanceNumber),
          name: fields.name ?? null,
          className: fields.className ?? null,
          passcode,
        },
        update: {
          ...(fields.name !== undefined ? { name: fields.name } : {}),
          ...(fields.className !== undefined
            ? { className: fields.className }
            : {}),
        },
      }),
    );
  }

  /** Gives a student without a passcode one. A no-op (returns as-is) when already set. */
  async ensurePasscode(student: Student): Promise<Student> {
    if (student.passcode) return student;
    return withFreshPasscode((passcode) =>
      this.prisma.student.update({
        where: { id: student.id },
        data: { passcode },
      }),
    );
  }

  update(
    studentCode: string,
    fields: StudentFields & { isActive?: boolean },
  ): Promise<Student> {
    return this.prisma.student.update({
      where: { studentCode },
      data: {
        ...(fields.name !== undefined ? { name: fields.name } : {}),
        ...(fields.className !== undefined
          ? { className: fields.className }
          : {}),
        ...(fields.isActive !== undefined ? { isActive: fields.isActive } : {}),
      },
    });
  }
}
