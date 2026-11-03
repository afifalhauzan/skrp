import { notFound } from "next/navigation";
import { MissionBrief } from "@/components/MissionBrief";
import { safeBackPath } from "@/lib/nav";
import { cases } from "@/lib/mock-data";

export default function MissionForCase({
  params,
  searchParams,
}: {
  params: { caseId: string };
  searchParams: { from?: string | string[] };
}) {
  if (!cases.some((c) => c.id === params.caseId)) notFound();
  return (
    <MissionBrief
      caseId={params.caseId}
      from={safeBackPath(searchParams.from)}
    />
  );
}
