/**
 * Seeds the class roster from prisma/roster.ts. Idempotent: students are matched by
 * attendance number, so re-running never duplicates rows, never changes a student
 * code, and syncs names from the roster file. className is only touched when the
 * roster entry sets one.
 *
 *   pnpm --filter @skrp/api seed        (needs DATABASE_URL)
 */
import { PrismaClient } from "@prisma/client";
import { formatStudentCode } from "../src/lib/studentCode";
import { ROSTER } from "./roster";

async function main() {
  const prisma = new PrismaClient();
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
      console.log(`${student.studentCode}  ${student.name}`);
    }
    console.log(`seeded ${ROSTER.length} students`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
