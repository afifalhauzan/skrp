import type { StudentProfile } from "@skrp/shared";

/**
 * Local-development fixtures used ONLY by the mock API client. These are not real
 * students: the real roster is supplied later through the backend.
 * Codes follow the same PY### format the backend generates from attendance numbers.
 */
export const MOCK_STUDENTS: StudentProfile[] = [
  {
    studentCode: "PY001",
    name: "[MOCK] Siswa Contoh 1",
    className: "XII-MOCK",
  },
  {
    studentCode: "PY002",
    name: "[MOCK] Siswa Contoh 2",
    className: "XII-MOCK",
  },
  // Deliberately nameless: exercises the "roster not supplied yet" UI path.
  { studentCode: "PY003", name: null, className: null },
  // Special accounts: no class, custom name (mirrors api/prisma/roster.ts).
  { studentCode: "VALIDATOR001", name: "[MOCK] Validator 1", className: null },
  { studentCode: "VALIDATOR002", name: "[MOCK] Validator 2", className: null },
];
