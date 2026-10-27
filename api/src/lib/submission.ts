import { createHash } from "node:crypto";
import type {
  ArtifactKind,
  ExecutionMetadata,
  ProblemSpec,
  StageId,
} from "@skrp/shared";

/** The student's working copies, as stored in the database. */
export interface WorkingSet {
  spec?: ProblemSpec;
  pseudocode?: string;
  /** JSON string of a Flowchart, as saved by the web app. */
  flowchart?: string;
  code?: {
    id: string;
    revisionNumber: number;
    source: string;
    stdin: string;
    execution: ExecutionMetadata | null;
  };
}

export interface PromptItem {
  label: string;
  content: string;
}

export interface StageSubmission {
  stage: StageId;
  /** Identifies exactly the work assessed; stable across moves of flowchart boxes etc. */
  hash: string;
  /** Non-code artifacts to snapshot as ArtifactRevision rows. */
  artifactSnapshots: { kind: ArtifactKind; content: unknown; hash: string }[];
  codeRevisionId: string | null;
  codeRevisionNumber: number | null;
  /** The work itself, for the prompt. */
  work: PromptItem[];
  /** Earlier-stage work given as context only (not part of the hash). */
  context: PromptItem[];
  /** Latest browser-run result for the code; unverified. */
  execution: ExecutionMetadata | null;
}

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const nonEmpty = (s?: string) => !!s && s.trim().length > 0;

export const specText = (spec: ProblemSpec) =>
  [
    `Tujuan: ${spec.goal}`,
    `Input: ${spec.input}`,
    `Proses: ${spec.process}`,
    `Output: ${spec.output}`,
    `Batasan: ${spec.constraints}`,
  ].join("\n");

interface FlowGraph {
  nodes: { id: string; kind: string; label: string }[];
  edges: { source: string; target: string; label?: string }[];
}

function parseFlowchart(json: string | undefined): FlowGraph | null {
  if (!json) return null;
  try {
    const g = JSON.parse(json) as Partial<FlowGraph>;
    if (!Array.isArray(g.nodes) || !Array.isArray(g.edges)) return null;
    return {
      nodes: g.nodes.map((n) => ({
        id: String(n.id),
        kind: String(n.kind),
        label: String(n.label ?? ""),
      })),
      edges: g.edges.map((e) => ({
        source: String(e.source),
        target: String(e.target),
        label: e.label ? String(e.label) : undefined,
      })),
    };
  } catch {
    return null;
  }
}

/** Positions and student/ai origin are deliberately ignored: they do not change meaning. */
export function flowchartText(json: string | undefined): string {
  const g = parseFlowchart(json);
  if (!g || g.nodes.length === 0) return "";
  const label = new Map(g.nodes.map((n) => [n.id, n.label || n.kind]));
  const nodes = [...g.nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => `[${n.id}] (${n.kind}) ${n.label}`);
  const edges = g.edges
    .map(
      (e) =>
        `${label.get(e.source) ?? e.source} --${e.label ?? ""}--> ${label.get(e.target) ?? e.target}`,
    )
    .sort();
  return `Node:\n${nodes.join("\n")}\nPanah:\n${edges.join("\n")}`;
}

/**
 * Returns the stage's submission, or a human-readable reason it cannot be submitted yet
 * (nothing to evaluate).
 */
export function buildStageSubmission(
  stage: StageId,
  work: WorkingSet,
): StageSubmission | { missing: string } {
  const base = {
    stage,
    artifactSnapshots: [],
    codeRevisionId: null,
    codeRevisionNumber: null,
    context: [] as PromptItem[],
    execution: null,
  };

  if (stage === "understand") {
    const spec = work.spec;
    if (!spec || !Object.values(spec).some(nonEmpty))
      return { missing: "Spesifikasi masalah masih kosong." };
    const text = specText(spec);
    return {
      ...base,
      hash: sha(`${stage}\n${text}`),
      artifactSnapshots: [
        { kind: "PROBLEM_SPEC", content: spec, hash: sha(text) },
      ],
      work: [{ label: "Spesifikasi masalah dari siswa", content: text }],
    };
  }

  const context: PromptItem[] = [];
  if (work.spec && Object.values(work.spec).some(nonEmpty)) {
    context.push({
      label: "Spesifikasi masalah siswa (konteks)",
      content: specText(work.spec),
    });
  }

  if (stage === "design") {
    const flow = flowchartText(work.flowchart);
    if (!nonEmpty(work.pseudocode) && !flow)
      return { missing: "Pseudocode dan flowchart masih kosong." };
    const snapshots: StageSubmission["artifactSnapshots"] = [];
    const items: PromptItem[] = [];
    if (nonEmpty(work.pseudocode)) {
      snapshots.push({
        kind: "PSEUDOCODE",
        content: work.pseudocode,
        hash: sha(work.pseudocode!),
      });
      items.push({ label: "Pseudocode siswa", content: work.pseudocode! });
    }
    if (flow) {
      snapshots.push({
        kind: "FLOWCHART",
        content: work.flowchart,
        hash: sha(flow),
      });
      items.push({ label: "Flowchart siswa (diringkas)", content: flow });
    }
    return {
      ...base,
      context,
      hash: sha(`${stage}\n${work.pseudocode ?? ""}\n${flow}`),
      artifactSnapshots: snapshots,
      work: items,
    };
  }

  // implement / test: the Python code is the submission
  const code = work.code;
  if (!code || !nonEmpty(code.source))
    return { missing: "Kode Python masih kosong." };
  if (nonEmpty(work.pseudocode))
    context.push({
      label: "Pseudocode siswa (konteks)",
      content: work.pseudocode!,
    });
  const flow = flowchartText(work.flowchart);
  if (flow) context.push({ label: "Flowchart siswa (konteks)", content: flow });
  return {
    ...base,
    context,
    hash: sha(`${stage}\n${code.source}`),
    codeRevisionId: code.id,
    codeRevisionNumber: code.revisionNumber,
    work: [{ label: "Kode Python siswa", content: code.source }],
    execution: code.execution,
  };
}

export const shortRef = (hash: string) => hash.slice(0, 12);
