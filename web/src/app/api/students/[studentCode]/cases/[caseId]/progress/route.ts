import { badParam, forward, patterns } from "@/lib/server/backend";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { studentCode: string; caseId: string } },
) {
  if (!patterns.STUDENT_CODE.test(params.studentCode))
    return badParam("student code");
  if (!patterns.CASE_ID.test(params.caseId)) return badParam("case id");
  return forward({
    method: "PUT",
    path: `/api/students/${params.studentCode.toUpperCase()}/cases/${params.caseId}/progress`,
    request,
  });
}
