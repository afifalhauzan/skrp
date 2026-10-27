"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shell } from "./Shell";
import { useLearning } from "@/features/learning/LearningProvider";
import { containerCls } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function LoadingCard({ label = "Memuat…" }: { label?: string }) {
  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="text-center">
        <p role="status" className="text-sm text-muted-foreground">
          {label}
        </p>
      </CardContent>
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
    <Alert variant="destructive" className="mx-auto max-w-md">
      <AlertTitle>Terjadi masalah</AlertTitle>
      <AlertDescription>
        <p role="alert">{message}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onRetry}
          >
            Coba lagi
          </Button>
        )}
      </AlertDescription>
    </Alert>
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
      <main className={cn(containerCls, "py-16")}>
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
