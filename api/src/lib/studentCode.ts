/**
 * Single source of truth for student codes.
 *
 * The attendance number is the only input: 1 -> PY001, 12 -> PY012, 1000 -> PY1000.
 * Codes are never derived from array indexes, query order, or display names.
 */

export const STUDENT_CODE_PREFIX = "PY";
export const MIN_ATTENDANCE_NUMBER = 1;
/** Far above any real class size; keeps codes sane and well inside a Postgres INT. */
export const MAX_ATTENDANCE_NUMBER = 999_999;

const CODE_PATTERN = /^PY(\d{3,})$/;
/** Reserved non-roster accounts (VALIDATOR001, DUMMY01). They have no attendance number. */
const SPECIAL_PATTERN = /^(VALIDATOR\d{3}|DUMMY\d{2})$/;

export function isSpecialCode(code: string): boolean {
  return SPECIAL_PATTERN.test(code);
}

export function isValidAttendanceNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= MIN_ATTENDANCE_NUMBER &&
    value <= MAX_ATTENDANCE_NUMBER
  );
}

export function formatStudentCode(attendanceNumber: number): string {
  if (!isValidAttendanceNumber(attendanceNumber)) {
    throw new RangeError(
      `attendanceNumber must be an integer between ${MIN_ATTENDANCE_NUMBER} and ${MAX_ATTENDANCE_NUMBER}`,
    );
  }
  return `${STUDENT_CODE_PREFIX}${String(attendanceNumber).padStart(3, "0")}`;
}

/** Normalises user input (`py001`, ` PY001 `) to canonical form, or null when malformed. */
export function normalizeStudentCode(input: string): string | null {
  const value = input.trim().toUpperCase();
  if (isSpecialCode(value)) return value;
  const match = CODE_PATTERN.exec(value);
  if (!match) return null;
  const number = Number(match[1]);
  if (!isValidAttendanceNumber(number)) return null;
  // Reject non-canonical padding such as PY0001 so one student has exactly one code.
  return formatStudentCode(number) === value ? value : null;
}

export function attendanceNumberFromCode(code: string): number | null {
  const normalized = normalizeStudentCode(code);
  return normalized && !isSpecialCode(normalized)
    ? Number(normalized.slice(STUDENT_CODE_PREFIX.length))
    : null;
}
