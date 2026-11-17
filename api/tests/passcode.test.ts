import { describe, expect, it, vi } from "vitest";
import { LoginThrottle } from "../src/lib/loginThrottle";
import {
  generatePasscode,
  isValidPasscode,
  normalizePasscode,
  passcodesMatch,
} from "../src/lib/passcode";
import { StudentService } from "../src/services/studentService";
import type { StudentRepository } from "../src/repositories/studentRepository";

describe("passcode format", () => {
  it("accepts exactly 4 uppercase letters/digits", () => {
    for (const ok of ["AB12", "ABCD", "1234", "Z9Z9"])
      expect(isValidPasscode(ok)).toBe(true);
  });

  it("rejects everything else", () => {
    for (const bad of ["", "ABC", "ABCDE", "ab12", "AB 1", "AB-1", "AB1!", null])
      expect(isValidPasscode(bad)).toBe(false);
  });

  it("normalises case and whitespace on input", () => {
    expect(normalizePasscode(" ab12 ")).toBe("AB12");
    expect(normalizePasscode("ab1")).toBeNull();
  });

  it("generates valid passcodes with at least one letter and one digit", () => {
    for (let i = 0; i < 500; i++) {
      const code = generatePasscode();
      expect(isValidPasscode(code)).toBe(true);
      expect(code).toMatch(/[A-Z]/);
      expect(code).toMatch(/\d/);
      expect(code).not.toMatch(/[01IO]/);
    }
  });

  it("compares in a null-safe way", () => {
    expect(passcodesMatch("AB12", "AB12")).toBe(true);
    expect(passcodesMatch("AB12", "AB13")).toBe(false);
    expect(passcodesMatch("AB12", null)).toBe(false);
  });
});

describe("LoginThrottle", () => {
  it("locks after the limit and unlocks once the window passes", () => {
    let now = 1_000;
    const throttle = new LoginThrottle(3, 60_000, () => now);
    for (let i = 0; i < 3; i++) {
      expect(throttle.retryAfterSeconds("PY001")).toBe(0);
      throttle.recordFailure("PY001");
    }
    expect(throttle.retryAfterSeconds("PY001")).toBeGreaterThan(0);
    expect(throttle.retryAfterSeconds("PY002")).toBe(0);
    now += 61_000;
    expect(throttle.retryAfterSeconds("PY001")).toBe(0);
  });
});

describe("StudentService.login", () => {
  const student = {
    id: "1",
    studentCode: "PY001",
    name: "A",
    className: "XII 1",
    passcode: "AB12",
    isActive: true,
  };
  const service = (row: unknown, throttle = new LoginThrottle()) =>
    new StudentService(
      { findByCode: vi.fn().mockResolvedValue(row) } as unknown as StudentRepository,
      throttle,
    );

  it("returns the profile (without the passcode) on a match", async () => {
    const profile = await service(student).login("PY001", "AB12");
    expect(profile).toEqual({
      studentCode: "PY001",
      name: "A",
      className: "XII 1",
    });
  });

  it.each([
    ["wrong passcode", student, "ZZ99"],
    ["unknown student", null, "AB12"],
    ["inactive student", { ...student, isActive: false }, "AB12"],
    ["student without a passcode", { ...student, passcode: null }, "AB12"],
  ])("rejects %s with the same error", async (_label, row, passcode) => {
    await expect(service(row).login("PY001", passcode)).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
    });
  });

  it("answers 429 after repeated failures, even for the right passcode", async () => {
    const svc = service(student, new LoginThrottle(2));
    for (let i = 0; i < 2; i++)
      await expect(svc.login("PY001", "ZZ99")).rejects.toMatchObject({
        status: 401,
      });
    await expect(svc.login("PY001", "AB12")).rejects.toMatchObject({
      status: 429,
    });
  });
});
