/**
 * Development seed. Idempotent: re-running never duplicates rows and never
 * overwrites a name that was filled in later. All records are clearly mock data;
 * the real roster is loaded via POST /api/students/import.
 */
import { PrismaClient } from "@prisma/client";
import { formatStudentCode } from "../src/lib/studentCode";

const MOCK_STUDENT_COUNT = 3;

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed mock students when NODE_ENV=production.");
  }
  const prisma = new PrismaClient();
  try {
    for (
      let attendanceNumber = 1;
      attendanceNumber <= MOCK_STUDENT_COUNT;
      attendanceNumber++
    ) {
      const student = await prisma.student.upsert({
        where: { attendanceNumber },
        create: {
          attendanceNumber,
          studentCode: formatStudentCode(attendanceNumber),
          name: `[MOCK] Siswa Contoh ${attendanceNumber}`,
          className: "XII-MOCK",
        },
        update: {},
      });
      console.log(
        `seeded ${student.studentCode} (${student.name ?? "no name"})`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
