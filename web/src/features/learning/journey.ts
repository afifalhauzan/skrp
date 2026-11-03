import { cases as allCases } from "@/lib/mock-data";
import { computeJourney, type Journey } from "./journey-core";
import { useLearning } from "./LearningProvider";

export { computeJourney } from "./journey-core";
export type { Journey, JourneyCase, JourneyCaseStatus } from "./journey-core";

export function useJourney(): Journey {
  const learning = useLearning();
  return computeJourney({
    cases: allCases,
    progress: learning.progressFor,
    routing: learning.routingFor,
    aiEnabled: learning.aiEnabled,
  });
}
