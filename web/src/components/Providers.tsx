"use client";
import type { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { LearningProvider } from "@/features/learning/LearningProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LearningProvider>
      {children}
      <Toaster
        position="top-center"
        gutter={8}
        toastOptions={{
          duration: 4000,
          className: "!text-sm",
          style: {
            background: "var(--card)",
            color: "var(--card-foreground)",
            border: "1px solid var(--border)",
            maxWidth: "min(92vw, 28rem)",
          },
          error: { duration: 6000 },
        }}
      />
    </LearningProvider>
  );
}
