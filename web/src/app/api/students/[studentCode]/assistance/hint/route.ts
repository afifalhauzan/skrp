import {
  AI_TIMEOUT_MS,
  badParam,
  forward,
  patterns,
} from "@/lib/server/backend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: { studentCode: string } },
) {
  if (!patterns.STUDENT_CODE.test(params.studentCode))
    return badParam("student code");
  return forward({
    method: "POST",
    path: `/api/students/${params.studentCode.toUpperCase()}/assistance/hint`,
    request,
    timeoutMs: AI_TIMEOUT_MS,
  });
}
