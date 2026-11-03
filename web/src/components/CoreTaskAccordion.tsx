import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LABEL_CORE } from "@/lib/strategy-copy";
import type { CaseDefinition } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * "Tugas Inti" as an accordion (native <details>: keyboard and screen-reader friendly).
 * The workspace renders it twice: closed under the progress bar on mobile, and open in the
 * sidebar on desktop.
 */
export function CoreTaskAccordion({
  item,
  note,
  defaultOpen = false,
  className,
}: {
  item: CaseDefinition;
  note: string;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-xl border bg-card text-card-foreground shadow-xs",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary">{LABEL_CORE}</Badge>
          <span className="truncate text-sm font-medium">
            Kasus {item.number} · aturan &amp; format
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t px-4 pb-4 pt-3">
        <p className="text-sm leading-6">{item.goal}</p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Aturan tugas inti
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-5">
          {item.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{note}</p>
      </div>
    </details>
  );
}
