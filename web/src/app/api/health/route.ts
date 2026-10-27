export const dynamic = "force-dynamic";

/** Liveness of the Next.js server only. It does not call the Express API. */
export function GET() {
  return Response.json(
    { status: "ok" },
    { headers: { "cache-control": "no-store" } },
  );
}
