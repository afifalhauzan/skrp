import type { PrismaClient, Student } from "@prisma/client";
import { formatStudentCode } from "../lib/studentCode";

export interface StudentFields {
  name?: string | null;
  className?: string | null;
}

export class StudentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByCode(studentCode: string): Promise<Student | null> {
    return this.prisma.student.findUnique({ where: { studentCode } });
  }

  list(limit: number, afterAttendance: number): Promise<Student[]> {
    return this.prisma.student.findMany({
      where: { attendanceNumber: { gt: afterAttendance } },
      orderBy: { attendanceNumber: "asc" },
      take: limit,
    });
  }

  /**
   * Relies on the unique constraints on attendanceNumber and studentCode, so two
   * concurrent creates for the same number cannot both succeed (one gets P2002).
   */
  create(attendanceNumber: number, fields: StudentFields): Promise<Student> {
    return this.prisma.student.create({
      data: {
        attendanceNumber,
        studentCode: formatStudentCode(attendanceNumber),
        name: fields.name ?? null,
        className: fields.className ?? null,
      },
    });
  }

  /** Idempotent: the code is only ever set on insert, never rewritten on update. */
  upsertByAttendance(
    attendanceNumber: number,
    fields: StudentFields,
  ): Promise<Student> {
    return this.prisma.student.upsert({
      where: { attendanceNumber },
      create: {
        attendanceNumber,
        studentCode: formatStudentCode(attendanceNumber),
        name: fields.name ?? null,
        className: fields.className ?? null,
      },
      update: {
        ...(fields.name !== undefined ? { name: fields.name } : {}),
        ...(fields.className !== undefined
          ? { className: fields.className }
          : {}),
      },
    });
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
