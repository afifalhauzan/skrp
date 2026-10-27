import {
  AI_TIMEOUT_MS,
  badParam,
  forward,
  isStage,
  patterns,
} from "@/lib/server/backend";

export const dynamic = "force-dynamic";
/** The model call can take ~45 s; raise the platform limit (Vercel) accordingly. */
export const maxDuration = 60;

type Params = { params: { studentCode: string } };

export async function POST(request: Request, { params }: Params) {
  if (!patterns.STUDENT_CODE.test(params.studentCode))
    return badParam("student code");
  return forward({
    method: "POST",
    path: `/api/students/${params.studentCode.toUpperCase()}/evaluations/stages`,
    request,
    timeoutMs: AI_TIMEOUT_MS,
  });
}

export async function GET(request: Request, { params }: Params) {
  if (!patterns.STUDENT_CODE.test(params.studentCode))
    return badParam("student code");
  const url = new URL(request.url);
  const caseId = url.searchParams.get("caseId") ?? "";
  const stage = url.searchParams.get("stage");
  if (!patterns.CASE_ID.test(caseId)) return badParam("case id");
  if (stage !== null && !isStage(stage)) return badParam("stage");
  return forward({
    method: "GET",
    path: `/api/students/${params.studentCode.toUpperCase()}/evaluations/stages`,
    query: { caseId, ...(stage ? { stage } : {}) },
    request,
  });
}
