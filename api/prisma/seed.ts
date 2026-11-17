/**
 * Seeds the class roster from prisma/roster.ts. Idempotent: students are matched by
 * attendance number, so re-running never duplicates rows, never changes a student
 * code, and syncs names from the roster file. className is only touched when the
 * roster entry sets one.
 *
 * Every student also gets a unique 4-character passcode (A-Z0-9) on first seed. Existing
 * passcodes are never rotated, so re-running is safe. The passcodes are printed so the
 * teacher can hand them out; treat that output as sensitive.
 *
 *   pnpm --filter @skrp/api seed        (needs DATABASE_URL)
 */
import { PrismaClient } from "@prisma/client";
import { StudentRepository } from "../src/repositories/studentRepository";
import { formatStudentCode } from "../src/lib/studentCode";
import { ROSTER, SPECIAL_ACCOUNTS } from "./roster";

async function main() {
  const prisma = new PrismaClient();
  const students = new StudentRepository(prisma);
  try {
    for (const entry of ROSTER) {
      const student = await prisma.student.upsert({
        where: { attendanceNumber: entry.attendanceNumber },
        create: {
          attendanceNumber: entry.attendanceNumber,
          studentCode: formatStudentCode(entry.attendanceNumber),
          name: entry.name,
          className: entry.className ?? null,
        },
        update: {
          name: entry.name,
          ...(entry.className !== undefined
            ? { className: entry.className }
            : {}),
        },
      });
      const ready = await students.ensurePasscode(student);
      console.log(`${ready.studentCode}  ${ready.passcode}  ${ready.name}`);
    }
    console.log(`seeded ${ROSTER.length} students`);

    // Special accounts are keyed by their code; they have no attendance number.
    for (const { studentCode, name } of SPECIAL_ACCOUNTS) {
      const account = await prisma.student.upsert({
        where: { studentCode },
        create: { studentCode, attendanceNumber: null, name, className: null },
        update: { name },
      });
      const ready = await students.ensurePasscode(account);
      console.log(`${studentCode}  ${ready.passcode}  ${name}  (special account)`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
