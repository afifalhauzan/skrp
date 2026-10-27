import { describe, expect, it } from "vitest";
import {
  attendanceNumberFromCode,
  formatStudentCode,
  isValidAttendanceNumber,
  normalizeStudentCode,
} from "../src/lib/studentCode";

describe("formatStudentCode", () => {
  it("pads attendance numbers to three digits", () => {
    expect(formatStudentCode(1)).toBe("PY001");
    expect(formatStudentCode(2)).toBe("PY002");
    expect(formatStudentCode(3)).toBe("PY003");
    expect(formatStudentCode(36)).toBe("PY036");
    expect(formatStudentCode(999)).toBe("PY999");
  });

  it("does not truncate numbers above 999", () => {
    expect(formatStudentCode(1000)).toBe("PY1000");
    expect(formatStudentCode(12345)).toBe("PY12345");
  });

  it("rejects invalid attendance numbers", () => {
    for (const bad of [0, -1, 1.5, NaN, Infinity, 1_000_000]) {
      expect(() => formatStudentCode(bad)).toThrow(RangeError);
    }
    expect(isValidAttendanceNumber("1")).toBe(false);
    expect(isValidAttendanceNumber(null)).toBe(false);
  });

  it("is deterministic and injective over a range", () => {
    const codes = new Set<string>();
    for (let n = 1; n <= 2000; n++) codes.add(formatStudentCode(n));
    expect(codes.size).toBe(2000);
  });
});

describe("normalizeStudentCode", () => {
  it("accepts canonical codes case-insensitively and trims", () => {
    expect(normalizeStudentCode("py001")).toBe("PY001");
    expect(normalizeStudentCode("  PY042 ")).toBe("PY042");
    expect(normalizeStudentCode("PY1000")).toBe("PY1000");
    expect(normalizeStudentCode(" validator001 ")).toBe("VALIDATOR001");
  });

  it("rejects malformed or non-canonical codes", () => {
    for (const bad of [
      "",
      "PY",
      "PY1",
      "PY12",
      "PY0001",
      "PY000",
      "XX001",
      "PY00A",
      "PY-001",
      "VALIDATOR1",
      "VALIDATOR0001",
      "VALIDATOR",
    ]) {
      expect(normalizeStudentCode(bad)).toBeNull();
    }
  });

  it("has no attendance number for special accounts", () => {
    expect(attendanceNumberFromCode("VALIDATOR001")).toBeNull();
  });

  it("round-trips with attendanceNumberFromCode", () => {
    for (const n of [1, 7, 99, 100, 999, 1000, 54321]) {
      expect(attendanceNumberFromCode(formatStudentCode(n))).toBe(n);
    }
  });
});
