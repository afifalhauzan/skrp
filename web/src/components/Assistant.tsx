"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AssistanceHistory,
  AssistanceInteraction,
  StageId,
} from "@skrp/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLearning } from "@/features/learning/LearningProvider";
import { ApiClientError } from "@/lib/api";
import { Mascot } from "./Mascot";

const LEVEL_LABEL: Record<string, string> = {
  L1: "L1 · Pertanyaan pemandu",
  L2: "L2 · Petunjuk konsep",
  L3: "L3 · Langkah terstruktur",
  L4: "L4 · Contoh sebagian",
  L5: "L5 · Penjelasan langsung",
};

type State = "idle" | "loading" | "error";

function newRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`;
}

/**
 * Contextual hint helper (the existing mascot card). In live mode it asks the backend,
 * which picks the allowed level (L1-L5) and has Gemini write the text. In mock mode it
 * shows a fixed example and says so.
 */
export function Assistant({
  caseId,
  stageId,
  stage,
}: {
  caseId: string;
  stageId: StageId;
  stage: string;
}) {
  const learning = useLearning();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<AssistanceHistory | null>(null);
  const [latest, setLatest] = useState<AssistanceInteraction | null>(null);
  const [mockShown, setMockShown] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Reused when retrying a failed request, so a retry cannot create a second hint.
  const requestId = useRef<string | null>(null);

  const { aiEnabled, hintHistory } = learning;
  const loadHistory = useCallback(async () => {
    try {
      setHistory(await hintHistory(caseId, stageId));
    } catch {
      setHistory(null); // non-fatal: the hint button still works
    }
  }, [hintHistory, caseId, stageId]);

  useEffect(() => {
    setLatest(null);
    setState("idle");
    setError("");
    requestId.current = null;
    setMockShown(false);
    if (aiEnabled) void loadHistory();
  }, [aiEnabled, loadHistory]);

  const ask = async () => {
    if (!aiEnabled) {
      setMockShown(true);
      return;
    }
    setState("loading");
    setError("");
    requestId.current ??= newRequestId();
    try {
      const interaction = await learning.requestHint(
        caseId,
        stageId,
        requestId.current,
      );
      requestId.current = null;
      setLatest(interaction);
      setState("idle");
      void loadHistory();
    } catch (e) {
      setState("error");
      setError(
        e instanceof ApiClientError && e.status === 429
          ? e.message
          : "Petunjuk belum bisa dimuat. Pekerjaanmu tetap aman; coba lagi.",
      );
    }
  };

  const loading = state === "loading";
  const previous =
    history?.interactions.filter((i) => i.id !== latest?.id).reverse() ?? [];

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col items-center gap-3">
        <Mascot
          variant={loading ? "thinking" : "standby"}
          alt={loading ? "Maskot sedang berpikir" : "Maskot siap membantu"}
          className="w-25 shrink-0"
        />
        <div className="w-full flex-1 space-y-2">
          {!latest && !mockShown && !loading && (
            <p className="text-sm leading-6">
              Butuh petunjuk untuk tahap {stage.toLowerCase()}?
            </p>
          )}
          {loading && (
            <p className="text-sm text-muted-foreground" role="status">
              Sedang menyiapkan petunjuk...
            </p>
          )}
          {state === "error" && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {mockShown && !aiEnabled && (
            <div className="space-y-1">
              <Badge variant="secondary">Contoh · belum terhubung ke AI</Badge>
              <p className="text-sm leading-6">
                Coba uraikan dulu informasi yang masuk, langkah yang dilakukan,
                dan hasil yang ingin dilihat. Mulai dari kata kerja utama pada
                misi.
              </p>
            </div>
          )}
          {latest && !loading && (
            <div className="space-y-1.5" data-testid="hint-latest">
              <div className="flex flex-wrap gap-1.5">
                <Badge>{LEVEL_LABEL[latest.level]}</Badge>
                {latest.status === "FALLBACK" && (
                  <Badge variant="destructive">
                    Cadangan · AI tidak tersedia
                  </Badge>
                )}
              </div>
              <p className="whitespace-pre-line text-sm leading-6">
                {latest.content}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={ask}
              disabled={loading}
            >
              {state === "error"
                ? "Coba lagi"
                : latest || mockShown
                  ? "Minta petunjuk lagi"
                  : "Minta petunjuk"}
            </Button>
            {(latest || mockShown) && !loading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLatest(null);
                  setMockShown(false);
                }}
              >
                Tutup petunjuk
              </Button>
            )}
          </div>

          {aiEnabled && history && (
            <p className="text-xs text-muted-foreground">
              Petunjuk berikutnya: tingkat {history.nextLevel} (maks.{" "}
              {history.maxLevel}). Tingkat ditentukan aplikasi.
            </p>
          )}

          {previous.length > 0 && (
            <div className="border-t pt-2">
              <button
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => setShowHistory((v) => !v)}
                aria-expanded={showHistory}
              >
                Riwayat petunjuk ({previous.length})
              </button>
              {showHistory && (
                <ul className="mt-2 space-y-2" data-testid="hint-history">
                  {previous.map((i) => (
                    <li
                      key={i.id}
                      className="rounded-md bg-background p-2 text-xs leading-5"
                    >
                      <span className="font-semibold">
                        {i.level}
                        {i.status === "FALLBACK" ? " (cadangan)" : ""}
                      </span>{" "}
                      {i.content}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
