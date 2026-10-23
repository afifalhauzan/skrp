import type { ProgressState } from "./types";
import { initialProgress } from "./mock-data";
const KEY = "pyscaffold-progress-v1";
export function loadProgress(): ProgressState {
  if (typeof window === "undefined") return initialProgress();
  try {
    const parsed = JSON.parse(
      localStorage.getItem(KEY) ?? "null",
    ) as Partial<ProgressState> | null;
    return parsed ? { ...initialProgress(), ...parsed } : initialProgress();
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
