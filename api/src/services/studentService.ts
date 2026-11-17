import type { Student } from "@prisma/client";
import type { StudentProfile, StudentRecord } from "@skrp/shared";
import { Prisma } from "../lib/prisma";
import { conflict, invalidCredentials, notFound, rateLimited } from "../lib/errors";
import { LoginThrottle } from "../lib/loginThrottle";
import { toProfile, toRecord } from "../lib/mappers";
import { passcodesMatch } from "../lib/passcode";
import type {
  StudentRepository,
  StudentFields,
} from "../repositories/studentRepository";

export class StudentService {
  constructor(
    private readonly students: StudentRepository,
    private readonly throttle = new LoginThrottle(),
  ) {}

  /**
   * Student sign-in. Unknown code, inactive student, missing passcode and wrong passcode all
   * produce the same error so none of them can be told apart from the outside.
   */
  async login(studentCode: string, passcode: string): Promise<StudentProfile> {
    const wait = this.throttle.retryAfterSeconds(studentCode);
    if (wait > 0)
      throw rateLimited(
        `Too many failed attempts. Try again in ${Math.ceil(wait / 60)} minute(s).`,
      );

    const student = await this.students.findByCode(studentCode);
    const ok =
      !!student?.isActive && passcodesMatch(passcode, student.passcode);
    if (!ok) {
      this.throttle.recordFailure(studentCode);
      throw invalidCredentials();
    }
    this.throttle.reset(studentCode);
    return toProfile(student);
  }

  /** Learner-facing lookup. Inactive students are treated as not found. */
  async getActiveStudent(studentCode: string): Promise<Student> {
    const student = await this.students.findByCode(studentCode);
    if (!student || !student.isActive) throw notFound("Student not found");
    return student;
  }

  async getProfile(studentCode: string): Promise<StudentProfile> {
    return toProfile(await this.getActiveStudent(studentCode));
  }

  async list(
    limit: number,
    after: string,
  ): Promise<{ students: StudentRecord[]; next: string | null }> {
    const rows = await this.students.list(limit, after);
    const last = rows[rows.length - 1];
    return {
      students: rows.map(toRecord),
      next: rows.length === limit && last ? last.studentCode : null,
    };
  }

  async create(
    attendanceNumber: number,
    fields: StudentFields,
  ): Promise<StudentRecord> {
    try {
      return toRecord(await this.students.create(attendanceNumber, fields));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw conflict(
          `A student with attendanceNumber ${attendanceNumber} already exists`,
        );
      }
      throw error;
    }
  }

  async update(
    studentCode: string,
    fields: StudentFields & { isActive?: boolean },
  ): Promise<StudentRecord> {
    try {
      return toRecord(await this.students.update(studentCode, fields));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw notFound("Student not found");
      }
      throw error;
    }
  }

  /** Idempotent roster import keyed by attendanceNumber. Safe to re-run. */
  async importRoster(
    rows: {
      attendanceNumber: number;
      name?: string | null;
      className?: string | null;
    }[],
  ): Promise<StudentRecord[]> {
    const result: StudentRecord[] = [];
    for (const row of rows) {
      result.push(
        toRecord(
          await this.students.upsertByAttendance(row.attendanceNumber, {
            name: row.name,
            className: row.className,
          }),
        ),
      );
    }
    return result;
  }
}
