import { describe, expect, it } from "vitest";
import { CASES } from "../../api/src/config/cases";
import { cases } from "../src/lib/mock-data";

// The backend copy of the cases drives AI prompts and test evidence; the web copy drives
// the UI and the test stage. They must describe the same core task.
describe("web and backend case definitions", () => {
  it("have the same cases in the same order", () => {
    expect(cases.map((c) => c.id)).toEqual(CASES.map((c) => c.id));
  });

  for (const web of cases) {
    it(`${web.id}: core task (title, rules, tests) matches the backend`, () => {
      const api = CASES.find((c) => c.id === web.id)!;
      expect({
        number: web.number,
        title: web.title,
        support: web.support,
        goal: web.goal,
        expected: web.expected,
        rules: web.rules,
        tests: web.tests.map(({ id, label, stdin, expected }) => ({
          id,
          label,
          stdin,
          expected,
        })),
      }).toEqual({
        number: api.number,
        title: api.title,
        support: api.support,
        goal: api.goal,
        expected: api.expected,
        rules: [...api.rules],
        tests: api.tests.map((t) => ({ ...t })),
      });
    });

    it(`${web.id}: optional exploration is kept out of the core task`, () => {
      // Exploration must never be part of the graded definition or the tests.
      const api = CASES.find((c) => c.id === web.id)!;
      expect(api).not.toHaveProperty("exploration");
      expect(web.exploration.ideas.length).toBeGreaterThan(0);
      for (const idea of web.exploration.ideas) {
        expect(idea.title).toBeTruthy();
        expect(idea.strategies.length).toBeGreaterThan(0);
      }
    });
  }
});
