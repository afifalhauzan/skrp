import { randomInt, timingSafeEqual } from "node:crypto";

/**
 * Student passcode: exactly 4 characters, uppercase letters and digits only.
 * Together with the student code it is what a student types to sign in.
 */
export const PASSCODE_LENGTH = 4;
export const PASSCODE_PATTERN = /^[A-Z0-9]{4}$/;

// Generated passcodes skip look-alikes (0/O, 1/I) because students type them by hand.
// Validation still accepts the full A-Z0-9 range.
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const ALPHABET = LETTERS + DIGITS;

export const isValidPasscode = (value: unknown): value is string =>
  typeof value === "string" && PASSCODE_PATTERN.test(value);

/** Trims and uppercases user input; null when it is not a well-formed passcode. */
export function normalizePasscode(input: string): string | null {
  const value = input.trim().toUpperCase();
  return PASSCODE_PATTERN.test(value) ? value : null;
}

/** Random passcode containing at least one letter and at least one digit. */
export function generatePasscode(): string {
  const chars = [
    LETTERS[randomInt(LETTERS.length)]!,
    DIGITS[randomInt(DIGITS.length)]!,
  ];
  while (chars.length < PASSCODE_LENGTH) {
    chars.push(ALPHABET[randomInt(ALPHABET.length)]!);
  }
  // Fisher-Yates so the guaranteed letter/digit are not always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

export function passcodesMatch(
  provided: string,
  expected: string | null,
): boolean {
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
