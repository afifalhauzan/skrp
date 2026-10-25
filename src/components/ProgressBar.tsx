import { Check } from "lucide-react";
import { stages } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { StageId } from "@/lib/types";

export function ProgressBar({
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
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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
            className={cn(
              "rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "border-primary bg-primary/10"
                : done
                  ? "bg-background hover:bg-muted"
                  : "bg-muted/50",
            )}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>{stage.short}</span>
              {done && <Check className="size-3.5 text-primary" />}
            </div>
            <div className="mt-1 text-sm font-semibold">{stage.label}</div>
          </button>
        );
      })}
    </div>
  );
}
