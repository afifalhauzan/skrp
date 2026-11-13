# Classroom load test (35 students, real end-to-end)

Path under test: **k6 -> web app (BFF) -> API -> Postgres + real Gemini**.
Each virtual user is one student doing case-1: open app, save spec, AI evaluation, AI hint,
(if passed) save pseudocode + AI design evaluation, load dashboard. About 2-3 Gemini calls per student.

## 0. One-time setup

Install k6 on the machine that generates load (your laptop is fine):

```bash
winget install k6 --source winget
```

Create 35 throwaway students (`PY9001`..`PY9035`, class `LOADTEST`) so real students are untouched.
The roster endpoints are admin-only and not exposed by the web app, so run this on the VPS
(or through an SSH tunnel: `ssh -L 4000:127.0.0.1:4000 your-vps`):

```bash
API_URL=http://127.0.0.1:4000 INTERNAL_API_KEY=... ADMIN_API_KEY=... node loadtest/seed-students.mjs seed 35
```

## 1. Run it (3 passes, in this order)

On the VPS, start the monitor first (it samples CPU, memory, Postgres connections every 2 s):

```bash
bash loadtest/vps-monitor.sh 300 2
```

Then on your laptop:

```bash
# Smoke: 3 students, confirms the script and the app work (cheap)
k6 run -e BASE_URL=https://YOUR-WEB-URL -e STUDENTS=3 -e RUN_ID=smoke loadtest/classroom.js

# Realistic: 35 students pressing "go" within 20 s
k6 run -e BASE_URL=https://YOUR-WEB-URL -e RAMP_SECONDS=20 -e RUN_ID=ramp20 loadtest/classroom.js

# Worst case: all 35 in the same second
k6 run -e BASE_URL=https://YOUR-WEB-URL -e RAMP_SECONDS=0 -e RUN_ID=burst loadtest/classroom.js
```

Each run uses new spec text (stamped with the run id), so Gemini is genuinely called every time.
Re-running with the **same** `RUN_ID` and students returns cached evaluations and tests nothing.
Each student is capped at 30 evaluations per hour; if you repeat runs a lot, `seed` fresh students
with `FIRST_NUMBER=9101`.

## 2. How to read the result

| Metric | Healthy | Means |
|---|---|---|
| `ai_stage_ms` p(95) | under 15 s | slowest 5% of "Periksa jawaban" clicks; timeout is 20 s |
| `ai_ok` | above 95% | AI calls returning 2xx |
| `ai_errors` (by `code`) | 0 | `AI_RATE_LIMITED` = Gemini quota, `AI_TIMEOUT` = too slow |
| `http_req_duration{kind:db}` p(95) | under 1.5 s | plain reads/writes while AI calls are in flight |
| `stage_passed` | high | students cleared the minimum score (no design stage if not) |

In the VPS CSV, watch `host_cpu_pct`, `api_mem_mb`, and `pg_conns` (should stay well under 100).
After the run, count AI failures by category from the API logs:

```bash
docker compose logs api --since 15m | grep stage_evaluation | grep -o '"failureCategory":"[A-Z_]*"' | sort | uniq -c
```

## 3. Cleanup

```bash
API_URL=http://127.0.0.1:4000 INTERNAL_API_KEY=... ADMIN_API_KEY=... node loadtest/seed-students.mjs cleanup 35
```

This deactivates the test students; their rows stay in the database. Results go to `loadtest/results/` (git-ignored).
