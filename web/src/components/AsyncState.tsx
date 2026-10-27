"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Shell } from "./Shell";
import { useLearning } from "@/features/learning/LearningProvider";

export function LoadingCard({ label = "Memuat…" }: { label?: string }) {
  return (
    <Card className="mx-auto max-w-md text-center">
      <p
        role="status"
        className="font-mono text-[11px] uppercase tracking-widest text-muted"
      >
        {label}
      </p>
    </Card>
  );
}

export function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="mx-auto max-w-md border-coral/40">
      <p className="text-sm font-bold text-coral">Terjadi masalah</p>
      <p role="alert" className="mt-2 text-sm leading-6 text-muted">
        {message}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry}>
            Coba lagi
          </Button>
        </div>
      )}
    </Card>
  );
}

/**
 * Renders children only once a student is signed in and their progress has loaded.
 * Handles the loading, error (with retry) and signed-out (redirect to /login) states
 * so pages do not repeat that logic.
 */
export function StudentGate({ children }: { children: ReactNode }) {
  const { load, reload } = useLearning();
  const router = useRouter();
  useEffect(() => {
    if (load.status === "anonymous") router.replace("/login");
  }, [load.status, router]);

  if (load.status === "ready") return <>{children}</>;
  return (
    <Shell>
      <main className="mx-auto max-w-[1024px] px-8 py-16">
        {load.status === "error" ? (
          <ErrorCard
            message={
              load.error.status === 0
                ? "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi."
                : "Data belajarmu belum dapat dimuat. Coba lagi sebentar lagi."
            }
            onRetry={load.error.isRetryable ? reload : undefined}
          />
        ) : (
          <LoadingCard label="Memuat data belajar…" />
        )}
      </main>
    </Shell>
  );
}
