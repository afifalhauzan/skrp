import { Workspace } from "@/components/Workspace";
export default function LearnPage({ params }: { params: { caseId: string; stageId: string } }) { return <Workspace caseId={params.caseId} stageId={params.stageId}/>; }
