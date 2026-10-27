"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mascot } from "./Mascot";

export function Assistant({ stage }: { stage: string }) {
  const [state, setState] = useState<"idle" | "loading" | "shown" | "error">(
    "idle",
  );
  const ask = () => {
    setState("loading");
    window.setTimeout(() => setState("shown"), 650);
  };
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex items-start gap-3">
        <Mascot
          variant={state === "loading" ? "thinking" : "standby"}
          alt={
            state === "loading"
              ? "Maskot sedang berpikir"
              : "Maskot siap membantu"
          }
          className="w-16 shrink-0"
        />
        <div className="flex-1 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Teman belajar
          </p>
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
