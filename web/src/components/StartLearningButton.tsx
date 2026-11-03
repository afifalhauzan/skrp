"use client";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/Shell";
import { useLearning } from "@/features/learning/LearningProvider";

/**
 * Landing-page call to action. The login is remembered in this browser, so a returning
 * student goes straight to the dashboard ("Perjalanan saya") and never types the code again.
 */
export function StartLearningButton() {
  const { student, load } = useLearning();
  if (load.status === "loading")
    return (
      <Button size="lg" disabled>
        Mulai belajar <ArrowRight />
      </Button>
    );
  return (
    <LinkButton href={student ? "/final-review" : "/login"} size="lg">
      Mulai belajar <ArrowRight />
    </LinkButton>
  );
}
