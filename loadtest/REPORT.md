# Classroom load test report: 35 students, real end-to-end

**Date:** 2026-11-13 / 14 · **Target:** `https://pyscaffold.vercel.app` (Vercel BFF) → `py.telaahkarier.com` API → Postgres + real Gemini (`gemini-2.5-flash`, Tier 1)
**Tool:** k6 v2.4.0 (`loadtest/classroom.js`), VPS sampled every 2 s (`loadtest/vps-monitor.sh`)

## Verdict

**A class of 35 can use the app at the same time.** Even with every student pressing "Periksa jawaban" in the same second, all 105 AI calls succeeded, all 35 students finished their journey, nothing was rate-limited, and the VPS never passed 15% CPU. No change is required before the classroom session.

## What was tested

Each virtual user is one student (`PY9001`–`PY9035`, class `LOADTEST`) doing case-1 through the real path:

1. open the app (profile + progress)
2. save the problem spec
3. **AI stage evaluation** ("understand")
4. **AI hint**
5. if the stage passed: save progress and pseudocode, then **AI stage evaluation** ("design")
6. load the dashboard snapshot

That is 3 Gemini calls per student, 105 per 35-student run. Every run used new text (stamped with a run id), so Gemini was called for real each time; identical work would have returned a cached evaluation.

## Results

| Run | Students | Start spread | AI calls OK | Journeys done | Stage eval p95 (max) | Hint p95 (max) | Plain requests p95 |
|---|---|---|---|---|---|---|---|
| Smoke 1 (Vercel in US East) | 3 | 5 s | 9 / 9 | 3 / 3 | 11.4 s (11.5 s) | 7.8 s (8.0 s) | **3.14 s, failed** |
| Smoke 2 (Vercel in Singapore) | 3 | 5 s | 9 / 9 | 3 / 3 | 10.0 s (10.2 s) | 6.8 s (6.8 s) | 355 ms |
| **Ramp** | 35 | 20 s | **105 / 105** | **35 / 35** | 11.7 s (14.4 s) | 8.3 s (10.8 s) | 116 ms (max 262 ms) |
| **Burst (worst case)** | 35 | 0 s, all at once | **105 / 105** | **35 / 35** | 10.1 s (10.6 s) | 9.6 s (11.4 s) | 736 ms (max 919 ms) |

Thresholds (all passed on the ramp and burst runs): AI p95 under 20 s, AI success above 95%, journeys finished above 95%, plain requests p95 under 1.5 s.
Average time for one student to finish the whole journey: 40 s (ramp), 31 s (burst), including 1 s think-time pauses.

### VPS (4 vCPU, 3.9 GB, shared with another project)

| Run | Peak host CPU | Peak memory | Peak DB CPU | Postgres connections |
|---|---|---|---|---|
| Idle | about 0 to 5% | 590 MB | 0% | 8 |
| Ramp | 14.3% | 667 MB | 10.9% | 10 (1 active) |
| Burst | 8.4% | 669 MB | 5.9% | 10 (1 active) |

The API itself answered plain requests in 10 to 15 ms in its own logs. API-container CPU samples are unreliable (`docker stats` snapshots can miss short spikes), so host CPU is the figure to trust. 0 `failureCategory` entries appeared in the API logs during any run.

## Findings

1. **Gemini is not the bottleneck.** Tier 1 allows 1,000 requests and 1M tokens per minute for this model. A 35-student session uses about 105 requests and roughly 245k tokens per minute (85k in + 160k out, burst), so about 10% and 25% of the limits.
2. **Vercel function region mattered a lot.** Functions were running in `iad1` (Virginia) while the VPS is in Asia. Plain requests had a median of 881 ms and a p95 of 3.1 s for only 3 students. After moving to `sin1`, the median is 89 ms and the p95 is 116 ms on the 35-student ramp. This was the one real problem found, and it is fixed.
3. **AI latency is the slowest thing a student sees.** A stage evaluation takes 5 to 14 s and a hint 2 to 11 s, with nothing near the 20 s timeout. This is Gemini's own response time and does not grow with 35 users. A clear loading state in the UI is worth having.
4. **Under the burst, plain requests slow down but stay fast.** While 35 AI calls were in flight, plain-request p95 rose from 116 ms to 736 ms, still half the threshold.

## Token usage

From the Gemini dashboard (cumulative readings): after the 2 smoke runs, 18 requests, 13k input, 19k output. After the ramp, 123 requests, 92k input, 174k output. After the burst, **228 requests, 177k input, 334k output**.

| Run | Requests | Input | Output |
|---|---|---|---|
| 2 smoke runs (dashboard) | 18 | 13k | 19k |
| Ramp (difference between readings) | 105 | 79k | 155k |
| Burst (difference between readings) | 105 | 85k | 160k |
| **Total, all testing (dashboard)** | **228** | **177k** | **334k** |

Per call: about 750 to 810 input and 1,480 to 1,520 output tokens. Output dominates, probably because thinking tokens count as output. One 35-student session costs about **$0.43** at $0.30 / $2.50 per 1M tokens (list prices from memory; check your billing page). The earlier projection for the burst (79k in, 155k out) was within about 5% of the dashboard.

## Limits of this test

- Only **case-1** and the **understand** and **design** stages were tested. The implement and test stages (code revisions, test results sent to the evaluator) were not.
- Python code execution runs in the student's browser (Pyodide), so it creates no server load and is not covered here.
- All virtual students used the same well-written answer, so every one passed. Real students will write longer, messier text (more input tokens) and some will fail a stage and retry (extra Gemini calls, capped at 3 attempts and 30 evaluations per student per hour).
- Load came from a single laptop connection. A classroom shares one school network, so a congested Wi-Fi is a risk this test cannot show.
- A Gemini outage or a bad-latency day cannot be simulated. The code handles it with one retry and a typed error, so students would see an error and can click again.
- The VPS is shared with another project (`gemastik-*`); that project was idle during the runs.

## Recommendations

- No code changes are required for a 35-student class.
- Keep the Vercel function region on `sin1` (Singapore), next to the VPS.
- Show a visible loading state for the 5 to 14 s AI calls so students don't double-click.
- Before the real session, send one test request (`/api/health`) and confirm Gemini billing is active.
- To re-run, use new students (`FIRST_NUMBER=9101`) or a new `RUN_ID`; see `loadtest/README.md`.

## Open items

- The 35 test students (`PY9001`–`PY9035`) are **still active** in the production database. Deactivate them with `node loadtest/seed-students.mjs cleanup 35` (on the VPS or via SSH tunnel). Their rows stay in the database.
