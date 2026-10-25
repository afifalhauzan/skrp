export type SupportLevel = "HIGH" | "MODERATE" | "LOW";
export type StageId = "understand" | "design" | "implement" | "test";
export type FlowNodeKind = "start" | "end" | "process" | "io" | "decision";
export interface FlowNode {
  id: string;
  kind: FlowNodeKind;
  label: string;
  x: number;
  y: number;
  /** "ai" = draft supplied by BE/AI; becomes "student" once the student edits the label. */
  origin: "ai" | "student";
}
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}
export interface Flowchart {
  nodes: FlowNode[];
  edges: FlowEdge[];
}
export interface ProblemSpec {
  goal: string;
  input: string;
  process: string;
  output: string;
  constraints: string;
}
export interface TestCase {
  id: string;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
}
export interface CaseDefinition {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  support: SupportLevel;
  context: string;
  goal: string;
  expected: string;
  tests: TestCase[];
}
export interface ExecutionResult {
  stdout: string;
  error?: string;
  traceback?: string;
  durationMs?: number;
}
export interface ProgressState {
  loggedIn: boolean;
  studentName: string;
  activeCaseId: string;
  completedStages: Record<string, StageId[]>;
  problemSpecs: Record<string, ProblemSpec>;
  pseudocode: Record<string, string>;
  flowchart: Record<string, Flowchart>;
  code: Record<string, string>;
  stdin: Record<string, string>;
  execution: Record<string, ExecutionResult | undefined>;
  tested: Record<string, boolean>;
  reflection: string;
}
