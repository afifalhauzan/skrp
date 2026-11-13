// Creates (or deactivates) throwaway students PY9001..PY9035 for the load test, so the
// real class roster and its progress are never touched.
//
//   API_URL=http://127.0.0.1:4000 INTERNAL_API_KEY=... ADMIN_API_KEY=... \
//     node loadtest/seed-students.mjs seed [count]
//   ... node loadtest/seed-students.mjs cleanup [count]     (sets isActive=false)
//
// The roster endpoints are admin-only and are NOT exposed by the web app, so this talks to
// the API directly: run it on the VPS, or through an SSH tunnel (ssh -L 4000:127.0.0.1:4000 vps).
const [mode = "seed", countArg = "35"] = process.argv.slice(2);
const count = Number(countArg);
const FIRST = Number(process.env.FIRST_NUMBER || 9001);
const { API_URL = "http://127.0.0.1:4000", INTERNAL_API_KEY, ADMIN_API_KEY } = process.env;

if (!ADMIN_API_KEY) {
  console.error("ADMIN_API_KEY is required (the roster endpoints are admin-only).");
  process.exit(1);
}
const headers = {
  "content-type": "application/json",
  "x-admin-key": ADMIN_API_KEY,
  ...(INTERNAL_API_KEY ? { "x-internal-key": INTERNAL_API_KEY } : {}),
};
const code = (n) => `PY${String(n).padStart(3, "0")}`;

if (mode === "seed") {
  const students = Array.from({ length: count }, (_, i) => ({
    attendanceNumber: FIRST + i,
    name: `LoadTest ${i + 1}`,
    className: "LOADTEST",
  }));
  const res = await fetch(`${API_URL}/api/students/import`, {
    method: "POST",
    headers,
    body: JSON.stringify({ students }),
  });
  console.log(res.status, await res.text());
  console.log(`codes: ${code(FIRST)} .. ${code(FIRST + count - 1)}`);
} else if (mode === "cleanup") {
  for (let i = 0; i < count; i++) {
    const res = await fetch(`${API_URL}/api/students/${code(FIRST + i)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ isActive: false }),
    });
    if (!res.ok) console.log(code(FIRST + i), res.status);
  }
  console.log(`deactivated ${count} students`);
} else {
  console.error("usage: seed-students.mjs seed|cleanup [count]");
  process.exit(1);
}
