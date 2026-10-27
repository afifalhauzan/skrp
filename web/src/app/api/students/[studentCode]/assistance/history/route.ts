import { badParam, forward, isStage, patterns } from "@/lib/server/backend";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { studentCode: string } },
) {
  if (!patterns.STUDENT_CODE.test(params.studentCode))
    return badParam("student code");
  const url = new URL(request.url);
  const caseId = url.searchParams.get("caseId") ?? "";
  const stage = url.searchParams.get("stage");
  if (!patterns.CASE_ID.test(caseId)) return badParam("case id");
  if (!isStage(stage)) return badParam("stage");
  return forward({
    method: "GET",
    path: `/api/students/${params.studentCode.toUpperCase()}/assistance/history`,
    query: { caseId, stage },
    request,
  });
}
