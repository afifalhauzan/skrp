import type { Student } from "@prisma/client";
import type { StudentProfile, StudentRecord } from "@skrp/shared";
import { Prisma } from "../lib/prisma";
import { conflict, notFound } from "../lib/errors";
import { toProfile, toRecord } from "../lib/mappers";
import type {
  StudentRepository,
  StudentFields,
} from "../repositories/studentRepository";

export class StudentService {
  constructor(private readonly students: StudentRepository) {}

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
