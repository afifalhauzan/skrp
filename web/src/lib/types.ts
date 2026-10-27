// Domain contracts (StageId, ProblemSpec, progress, artifacts...) live in @skrp/shared.
// This file holds only UI/content types for the case catalogue.
export type {
  StageId,
  ProblemSpec,
  Flowchart,
  FlowNode,
  FlowNodeKind,
  FlowEdge,
} from "@skrp/shared";

export type SupportLevel = "HIGH" | "MODERATE" | "LOW";
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
