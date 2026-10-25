import type { ProgressState } from "./types";
import { initialProgress } from "./data";
const KEY = "pyscaffold-progress-v1";
export function loadProgress(): ProgressState {
  if (typeof window === "undefined") return initialProgress();
  try {
    const parsed = JSON.parse(
      localStorage.getItem(KEY) ?? "null",
    ) as Partial<ProgressState> | null;
    if (!parsed) return initialProgress();
    // flowchart used to be a Mermaid string; drop anything that is not a graph.
    const flowchart = Object.fromEntries(
      Object.entries(parsed.flowchart ?? {}).filter(
        ([, v]) => typeof v === "object" && v !== null && "nodes" in v,
      ),
    );
    return { ...initialProgress(), ...parsed, flowchart };
  } catch {
    return initialProgress();
  }
}
export function saveProgress(progress: ProgressState) {
  if (typeof window !== "undefined")
    localStorage.setItem(KEY, JSON.stringify(progress));
}
export function resetProgress() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}
