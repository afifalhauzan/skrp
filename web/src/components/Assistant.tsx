"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ASSISTANT_HINT_STAGES,
  ASSISTANT_STRATEGY_HINT,
} from "@/lib/strategy-copy";
import type { StageId } from "@/lib/types";
import { Mascot } from "./Mascot";

export function Assistant({
  stage,
  stageId,
}: {
  stage: string;
  stageId?: StageId;
}) {
  const [state, setState] = useState<"idle" | "loading" | "shown" | "error">(
    "idle",
  );
  const ask = () => {
    setState("loading");
    window.setTimeout(() => setState("shown"), 650);
  };
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col items-center gap-3">
        <Mascot
          variant={state === "loading" ? "thinking" : "standby"}
          alt={
            state === "loading"
              ? "Maskot sedang berpikir"
              : "Maskot siap membantu"
          }
          className="w-25 shrink-0"
        />
        <div className="flex-1  space-y-2">
          {/* <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Teman belajar
          </p> */}
          {state === "idle" && (
            <>
              <p className="text-sm leading-6">
                Butuh petunjuk untuk tahap {stage.toLowerCase()}?
              </p>
              <Button variant="secondary" size="sm" onClick={ask}>
                Minta petunjuk
              </Button>
            </>
          )}
          {state === "loading" && (
            <p className="text-sm text-muted-foreground">
              Sedang menyiapkan petunjuk...
            </p>
          )}
          {state === "shown" && (
            <>
              <p className="text-sm leading-6">
                Coba uraikan dulu informasi yang masuk, langkah yang dilakukan,
                dan hasil yang ingin dilihat. Mulai dari kata kerja utama pada
                misi.
              </p>
              {stageId && ASSISTANT_HINT_STAGES.includes(stageId) && (
                <p className="text-sm leading-6 text-muted-foreground">
                  {ASSISTANT_STRATEGY_HINT}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setState("idle")}
              >
                Tutup petunjuk
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
