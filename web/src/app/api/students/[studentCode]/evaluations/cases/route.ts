import { badParam, forward, patterns } from "@/lib/server/backend";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { studentCode: string } },
) {
  if (!patterns.STUDENT_CODE.test(params.studentCode))
    return badParam("student code");
  return forward({
    method: "POST",
    path: `/api/students/${params.studentCode.toUpperCase()}/evaluations/cases`,
    request,
  });
}
