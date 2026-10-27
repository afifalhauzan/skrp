"use client";
import type { ReactNode } from "react";
import { LearningProvider } from "@/features/learning/LearningProvider";

export function Providers({ children }: { children: ReactNode }) {
  return <LearningProvider>{children}</LearningProvider>;
}
