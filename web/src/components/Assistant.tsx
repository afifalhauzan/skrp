"use client";
import { useState } from "react";
import { Card, Button } from "./Shell";
export function Assistant({ stage }: { stage: string }) {
  const [state, setState] = useState<"idle" | "loading" | "shown" | "error">(
    "idle",
  );
  const ask = () => {
    setState("loading");
    window.setTimeout(() => setState("shown"), 650);
  };
  return (
    <Card className="border-teal/20 bg-[#f2faf6]">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coral text-xl">
          ✦
        </div>
        <div className="flex-1">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-teal">
            Teman belajar
          </p>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            Petunjuk contoh · belum terhubung ke AI
          </p>
          {state === "idle" && (
            <>
              <p className="text-sm leading-6 text-navy">
                Butuh petunjuk untuk tahap {stage.toLowerCase()}?
              </p>
              <Button variant="secondary" onClick={ask}>
                Minta petunjuk
              </Button>
            </>
          )}
          {state === "loading" && (
            <p className="text-sm text-muted">Sedang menyiapkan petunjuk...</p>
          )}
          {state === "shown" && (
            <>
              <p className="text-sm leading-6 text-navy">
                Coba uraikan dulu informasi yang masuk, langkah yang dilakukan,
                dan hasil yang ingin dilihat. Mulai dari kata kerja utama pada
                misi.
              </p>
              <Button variant="ghost" onClick={() => setState("idle")}>
                Tutup petunjuk
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
