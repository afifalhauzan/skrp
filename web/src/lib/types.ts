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
  /** Short human-readable description of the scenario. */
  label: string;
  /** Lines fed to input(), one per call. */
  stdin: string;
  /** The program's last output line must equal this (prompts before it are ignored). */
  expected: string;
}
/** One optional way to extend a case with an algorithmic strategy. Never graded or required. */
export interface ExplorationIdea {
  title: string;
  description: string;
  /** Strategies/algorithms that genuinely fit this idea (e.g. "Brute force (linear search)"). */
  strategies: string[];
  /** Example records students may use to try the idea themselves. */
  sampleData?: string;
}
export interface CaseExploration {
  ideas: ExplorationIdea[];
  /** Why other strategies are not suggested for this case. */
  fit: string;
}
export interface CaseDefinition {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  support: SupportLevel;
  context: string;
  /** Longer narrative for the mission briefing page. */
  scenario: string;
  /** Where the story takes place, shown on the briefing page. */
  place: string;
  minutes: number;
  goal: string;
  expected: string;
  /** Rules and I/O format the student must follow; shown in every stage. */
  rules: string[];
  /** Optional exploration; kept apart from `rules`/`tests`, which define the core task. */
  exploration: CaseExploration;
  tests: TestCase[];
}
