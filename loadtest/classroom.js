// k6 end-to-end load test: one classroom of students working through case-1.
//
// Each virtual user (VU) is ONE student and does what a real student does, through the
// real path (k6 -> web BFF -> API -> Postgres + Gemini):
//   profile -> progress -> save problem spec -> AI stage evaluation (understand)
//   -> AI hint -> (if passed) save progress + pseudocode -> AI stage evaluation (design)
//   -> final progress snapshot.
//
//   k6 run -e BASE_URL=https://your-web-url loadtest/classroom.js
//
// Env:
//   BASE_URL      web app origin (required), e.g. https://skrp.vercel.app
//   STUDENTS      number of simultaneous students (default 35)
//   FIRST_NUMBER  attendance number of the first test student (default 9001 -> PY9001)
//   RAMP_SECONDS  students start at a random moment inside this window.
//                 0 = everyone at once (worst case), 20 = a realistic "go!" (default 5)
//   THINK_SECONDS pause between a student's steps (default 1)
//   RUN_ID        label for the result file (default: timestamp)
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.1.0/index.js";

const BASE_URL = (__ENV.BASE_URL || "").replace(/\/$/, "");
const STUDENTS = Number(__ENV.STUDENTS || 35);
const FIRST_NUMBER = Number(__ENV.FIRST_NUMBER || 9001);
const RAMP_SECONDS = Number(__ENV.RAMP_SECONDS || 5);
const THINK_SECONDS = Number(__ENV.THINK_SECONDS || 1);
const CASE_ID = "case-1";

// One Trend per AI operation so the report shows the numbers that matter.
const aiStageMs = new Trend("ai_stage_ms", true);
const aiHintMs = new Trend("ai_hint_ms", true);
const aiOk = new Rate("ai_ok"); // AI call returned 2xx with a completed result
const aiErrors = new Counter("ai_errors"); // tagged by HTTP status + API error code
const stagePassed = new Rate("stage_passed"); // student cleared the minimum score
const journeyDone = new Rate("journey_done"); // student finished every step they could

export const options = {
  scenarios: {
    classroom: {
      executor: "per-vu-iterations",
      vus: STUDENTS,
      iterations: 1,
      maxDuration: "10m",
    },
  },
  thresholds: {
    // Plain reads/writes must stay snappy even while 35 AI calls are in flight.
    "http_req_duration{kind:db}": ["p(95)<1500"],
    "http_req_failed{kind:db}": ["rate<0.01"],
    // The BFF/API time out an AI call at ~20 s (AI_TIMEOUT_MS); stay clear of that.
    ai_stage_ms: ["p(95)<20000"],
    ai_hint_ms: ["p(95)<20000"],
    ai_ok: ["rate>0.95"],
    journey_done: ["rate>0.95"],
  },
};

export function setup() {
  if (!BASE_URL) throw new Error("Set -e BASE_URL=https://your-web-origin");
  const health = http.get(`${BASE_URL}/api/health`);
  if (health.status !== 200)
    throw new Error(`${BASE_URL}/api/health returned ${health.status}`);
  // The same value for every VU: part of the spec text so each run is a NEW submission.
  // Without this the API returns the cached evaluation of identical work and never
  // calls Gemini, which would make the test look much faster than reality.
  const runId =
    __ENV.RUN_ID || new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  return { runId };
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function body(res) {
  try {
    return res.json();
  } catch (_) {
    return null;
  }
}

function call(method, path, payload, { kind, name, timeout }) {
  return http.request(
    method,
    `${BASE_URL}${path}`,
    payload === undefined ? null : JSON.stringify(payload),
    {
      headers: { "content-type": "application/json", accept: "application/json" },
      tags: { kind, name: `${method} ${name}` }, // `name` keeps per-student URLs from exploding metrics
      timeout: timeout || "30s",
    },
  );
}

function recordAi(res, trend) {
  trend.add(res.timings.duration);
  const data = body(res);
  const ok = res.status >= 200 && res.status < 300;
  aiOk.add(ok);
  if (!ok) {
    const code = (data && data.error && data.error.code) || "UNKNOWN";
    aiErrors.add(1, { status: String(res.status), code });
  }
  return ok ? data && data.data : null;
}

export default function (data) {
  const n = FIRST_NUMBER + __VU - 1;
  const code = `PY${String(n).padStart(3, "0")}`;
  const base = `/api/students/${code}`;
  const think = () => sleep(THINK_SECONDS * (0.5 + Math.random()));

  // Students do not all press the button in the same millisecond (unless RAMP_SECONDS=0).
  sleep(Math.random() * RAMP_SECONDS);

  let finished = true;

  // 1. Open the app.
  let res = call("GET", base, undefined, { kind: "db", name: "/students/:code" });
  check(res, { "profile 200": (r) => r.status === 200 }) || (finished = false);
  res = call("GET", `${base}/progress`, undefined, { kind: "db", name: "/progress" });
  check(res, { "progress 200": (r) => r.status === 200 }) || (finished = false);
  think();

  // 2. Write the problem spec (stage "understand").
  const spec = {
    goal: `Menghitung biaya parkir mobil atau motor dengan tarif bertingkat. [load-test ${data.runId} ${code}]`,
    input:
      "Baris 1: jenis kendaraan (mobil atau motor). Baris 2: lama parkir dalam jam, bilangan bulat minimal 1.",
    process:
      "Jam pertama mobil Rp5.000 dan motor Rp2.000. Setiap jam berikutnya mobil Rp3.000 dan motor Rp1.000. Jika total melebihi batas harian, pakai batas harian.",
    output: "Satu baris berformat 'Tarif: <angka>', contoh 'Tarif: 8000'.",
    constraints:
      "Batas maksimum per hari: mobil Rp20.000, motor Rp10.000. Lama parkir minimal 1 jam.",
  };
  res = call("PUT", `${base}/cases/${CASE_ID}/artifacts/problem-spec`, { content: spec }, {
    kind: "db",
    name: "/cases/:id/artifacts/:kind",
  });
  check(res, { "save spec 200": (r) => r.status === 200 }) || (finished = false);
  think();

  // 3. "Periksa jawaban": the first real Gemini call.
  res = call(
    "POST",
    `${base}/evaluations/stages`,
    { caseId: CASE_ID, stage: "understand" },
    { kind: "ai", name: "/evaluations/stages", timeout: "60s" },
  );
  const evalData = recordAi(res, aiStageMs);
  if (!evalData) finished = false;
  const passed = !!(evalData && evalData.evaluation && evalData.evaluation.completion.satisfied);
  stagePassed.add(passed);
  think();

  // 4. Ask for a hint: the second Gemini call.
  res = call(
    "POST",
    `${base}/assistance/hint`,
    { caseId: CASE_ID, stage: "understand", requestId: uuid() },
    { kind: "ai", name: "/assistance/hint", timeout: "60s" },
  );
  if (!recordAi(res, aiHintMs)) finished = false;
  think();

  // 5. Continue to the design stage only if the student legitimately passed.
  if (passed) {
    res = call(
      "PUT",
      `${base}/cases/${CASE_ID}/progress`,
      { currentStage: "design", completedStages: ["understand"] },
      { kind: "db", name: "/cases/:id/progress" },
    );
    check(res, { "save progress 200": (r) => r.status === 200 }) || (finished = false);

    const pseudocode = [
      "MULAI",
      "BACA jenis_kendaraan, jam",
      "JIKA jenis_kendaraan = mobil MAKA pertama=5000, lanjut=3000, batas=20000",
      "SELAIN ITU pertama=2000, lanjut=1000, batas=10000",
      "tarif = pertama + (jam - 1) * lanjut",
      "JIKA tarif > batas MAKA tarif = batas",
      "TAMPILKAN 'Tarif: ' + tarif",
      `SELESAI  (load-test ${data.runId} ${code})`,
    ].join("\n");
    res = call("PUT", `${base}/cases/${CASE_ID}/artifacts/pseudocode`, { content: pseudocode }, {
      kind: "db",
      name: "/cases/:id/artifacts/:kind",
    });
    check(res, { "save pseudocode 200": (r) => r.status === 200 }) || (finished = false);
    think();

    // Third Gemini call.
    res = call(
      "POST",
      `${base}/evaluations/stages`,
      { caseId: CASE_ID, stage: "design" },
      { kind: "ai", name: "/evaluations/stages", timeout: "60s" },
    );
    if (!recordAi(res, aiStageMs)) finished = false;
    think();
  }

  // 6. Dashboard ("Perjalanan saya") loads the full snapshot, the heaviest read.
  res = call("GET", `${base}/progress`, undefined, { kind: "db", name: "/progress" });
  check(res, { "final progress 200": (r) => r.status === 200 }) || (finished = false);

  journeyDone.add(finished);
}

export function handleSummary(data) {
  const runId = __ENV.RUN_ID || new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    [`loadtest/results/k6-${runId}.json`]: JSON.stringify(data, null, 2),
  };
}
