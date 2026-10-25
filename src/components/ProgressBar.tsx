import { stages } from "@/lib/data";
import type { StageId } from "@/lib/types";
export function ProgressBar({
  caseId,
  current,
  completed,
  onNavigate,
}: {
  caseId: string;
  current: StageId;
  completed: StageId[];
  onNavigate: (id: StageId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-px border border-[#dce6ef] bg-[#dce6ef] md:grid-cols-4">
      {stages.map((stage, index) => {
        const done = completed.includes(stage.id);
        const active = stage.id === current;
        const available =
          done ||
          active ||
          index === 0 ||
          completed.includes(stages[index - 1].id);
        return (
          <button
            key={stage.id}
            onClick={() => available && onNavigate(stage.id)}
            disabled={!available}
            className={`p-4 text-left transition ${active ? "bg-[#e9eef5]" : done ? "bg-white" : "bg-[#f8fbfe] opacity-55"} disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-muted">
              <span>{stage.short}</span>
              {done && <span>DONE</span>}
            </div>
            <div className="mt-2 text-sm font-bold text-ink">{stage.label}</div>
          </button>
        );
      })}
    </div>
  );
}
