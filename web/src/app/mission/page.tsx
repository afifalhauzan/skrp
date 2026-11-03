import { MissionBrief } from "@/components/MissionBrief";
import { safeBackPath } from "@/lib/nav";

export default function Mission({
  searchParams,
}: {
  searchParams: { from?: string | string[] };
}) {
  return (
    <MissionBrief caseId="case-1" from={safeBackPath(searchParams.from)} />
  );
}
