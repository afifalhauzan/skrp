export type SupportLevel = "HIGH" | "MODERATE" | "LOW";
export type StageId = "understand" | "design" | "implement" | "test";
export interface ProblemSpec { goal: string; input: string; process: string; output: string; constraints: string; }
export interface TestCase { id: string; input: string; expected: string; actual: string; passed: boolean; }
export interface CaseDefinition { id: string; number: number; title: string; subtitle: string; support: SupportLevel; context: string; goal: string; expected: string; tests: TestCase[]; }
export interface ExecutionResult { stdout: string; error?: string; traceback?: string; simulated: true; }
export interface ProgressState {
  loggedIn: boolean; studentName: string; activeCaseId: string; completedStages: Record<string, StageId[]>;
  problemSpecs: Record<string, ProblemSpec>; pseudocode: Record<string, string>; code: Record<string, string>;
  execution: Record<string, ExecutionResult | undefined>; tested: Record<string, boolean>; reflection: string;
}
