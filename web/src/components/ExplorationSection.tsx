import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BADGE_EXPLORATION,
  EXPLORATION_INTRO,
  EXPLORATION_NOT_GRADED,
  EXPLORATION_NOT_REQUIRED,
  LABEL_EXPLORATION,
} from "@/lib/strategy-copy";
import type { CaseDefinition } from "@/lib/types";

function Ideas({ item }: { item: CaseDefinition }) {
  return (
    <ul className="space-y-3">
      {item.exploration.ideas.map((idea) => (
        <li key={idea.title} className="rounded-lg border bg-background p-3">
          <p className="text-sm font-semibold">{idea.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {idea.description}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              Strategi yang relevan:
            </span>
            {idea.strategies.map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
          </div>
          {idea.sampleData && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Contoh data (satu transaksi per baris):
              </p>
              <pre className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-2 font-mono text-xs">
                {idea.sampleData}
              </pre>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Full section for the mission briefing. */
export function ExplorationSection({ item }: { item: CaseDefinition }) {
  return (
    <Card id="eksplorasi" className="border-dashed">
      <CardHeader>
        <Badge variant="secondary" className="w-fit">
          {BADGE_EXPLORATION}
        </Badge>
        <CardTitle className="mt-2">{LABEL_EXPLORATION}</CardTitle>
        <CardDescription className="leading-6">
          {EXPLORATION_INTRO}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-semibold">Ide untuk kasus ini</p>
        <Ideas item={item} />
        <p className="text-sm leading-6 text-muted-foreground">
          {item.exploration.fit} {EXPLORATION_NOT_REQUIRED}
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          {EXPLORATION_NOT_GRADED}
        </p>
      </CardContent>
    </Card>
  );
}

/** Collapsed version for the workspace; avoids repeating the full explanation. */
export function ExplorationDetails({ item }: { item: CaseDefinition }) {
  return (
    <details className="group rounded-xl border border-dashed p-3 text-sm">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
        <Badge variant="secondary">{BADGE_EXPLORATION}</Badge>
        {LABEL_EXPLORATION}
      </summary>
      <div className="mt-3 space-y-3">
        <Ideas item={item} />
        <p className="leading-6 text-muted-foreground">
          {item.exploration.fit} {EXPLORATION_NOT_REQUIRED}{" "}
          {EXPLORATION_NOT_GRADED}
        </p>
      </div>
    </details>
  );
}
