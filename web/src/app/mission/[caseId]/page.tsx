import { notFound } from "next/navigation";
import { MissionBrief } from "@/components/MissionBrief";
import { cases } from "@/lib/mock-data";

export default function MissionForCase({
  params,
}: {
  params: { caseId: string };
}) {
  if (!cases.some((c) => c.id === params.caseId)) notFound();
  return <MissionBrief caseId={params.caseId} />;
}
