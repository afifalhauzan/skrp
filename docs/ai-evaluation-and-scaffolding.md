# AI evaluation and scaffolding

A working but **intentionally incomplete** foundation: students submit work for a Gemini-based
evaluation, ask for level-controlled hints, and are routed between three fixed cases by an
explicit policy. The integration is real; the pedagogical policies are **provisional and
unvalidated**.

## How it fits together

```
Browser ──► Next.js BFF (/api/…) ──► Express API ──► LangChain.js ──► Gemini
                                         │
                                         └─► PostgreSQL (Prisma): artifacts, evaluations, hints, routing
```

| Responsibility                          | Where                                                                                    | Who decides                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| A. Stage evaluation (scores + feedback) | `api/src/integrations/langchain/evaluation.ts`, `services/evaluationService.ts`          | Gemini writes scores/feedback; the app validates them strictly |
| B. Micro scaffolding (hints L1–L5)      | `policies/assistance.ts`, `services/assistanceService.ts`                                | **App** picks the level; Gemini only writes text               |
| C. Macro scaffolding (next case)        | `policies/routing.ts`, `policies/caseEvaluation.ts`, `services/caseEvaluationService.ts` | **App**, deterministic, no model call                          |
| Stage completion                        | `policies/completion.ts`                                                                 | **App**, from the persisted evaluation of the _current_ work   |

LangChain.js (`@langchain/google-genai`, `ChatGoogleGenerativeAI.withStructuredOutput`) only
invokes the model. It owns no policy: no agents, tools, graphs or autonomous loops.

## Configure Gemini

Server-side only, in `api/.env` (local) or the VPS `.env` (Docker Compose):

```
GEMINI_API_KEY=<key from https://aistudio.google.com/apikey>
GEMINI_MODEL=gemini-2.5-flash      # optional; this is the default
AI_TIMEOUT_MS=20000                # per attempt
AI_MAX_RETRIES=1                   # extra attempts for timeouts / 429 / 5xx / malformed output
```

- **Model choice:** `gemini-2.5-flash` — supports structured (JSON-schema) output and is fast and
  inexpensive enough for per-submission evaluation. It is the only place the model id appears
  (`api/src/config/env.ts`); change it with `GEMINI_MODEL` if Google retires or supersedes it.
  I could not call Gemini with a real key while building this, so confirm it with the smoke test
  below before relying on it.
- The key is never sent to the browser: it is not a `NEXT_PUBLIC_*` variable and the BFF never sees
  it. With no key, AI endpoints answer `AI_NOT_CONFIGURED`; there is no mock fallback.

## Migrate and start

```bash
cd api
pnpm exec prisma migrate deploy        # applies 20260104000000_ai_evaluation_scaffolding (additive)
pnpm dev                               # API on :4000
pnpm --filter @skrp/web dev            # web (NEXT_PUBLIC_API_MODE=live, API_INTERNAL_URL=http://localhost:4000)
```

Docker: `docker compose run --rm migrate && docker compose up -d api` (the new variables are already
passed through `docker-compose.yml`). On Vercel, AI routes set `maxDuration = 60`; the Hobby plan
allows that, but a stricter plan limit would cut long evaluations.

## Try it

**In the app** (live mode, after logging in as e.g. `PY001`): on each stage press **Periksa jawaban**.
The result shows a score per rubric criterion with evidence, what went well, what to improve, and
whether the stage may be completed. **Lanjut** unlocks only for a successful evaluation of the
_current_ work. **Minta petunjuk** (mascot card) asks for a hint at the level the backend allows.
After stage 4, the case-review page asks the backend for the case evaluation and routing decision.

**With curl** (through the API directly; use `x-internal-key` if `INTERNAL_API_KEY` is set):

```bash
H='-H x-internal-key:$INTERNAL_API_KEY -H content-type:application/json'
curl -X POST $H localhost:4000/api/students/PY001/evaluations/stages \
  -d '{"caseId":"case-1","stage":"understand"}'
curl -X POST $H localhost:4000/api/students/PY001/assistance/hint \
  -d "{\"caseId\":\"case-1\",\"stage\":\"understand\",\"requestId\":\"$(uuidgen)\"}"
curl "localhost:4000/api/students/PY001/assistance/history?caseId=case-1&stage=understand" $H
curl -X POST $H localhost:4000/api/students/PY001/evaluations/cases -d '{"caseId":"case-1"}'
```

**Real-API smoke test** (two small Gemini requests; no database needed):

```bash
GEMINI_API_KEY=... pnpm --filter @skrp/api smoke:gemini
```

## API (all under `/api`, internal key required; student identity is the student code in the path)

| Method + path                                          | Purpose                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `POST /students/:code/evaluations/stages`              | Evaluate the saved work of a stage `{caseId, stage, codeRevision?, testResults?}` |
| `GET /students/:code/evaluations/stages/:id`           | One evaluation (with `isCurrent`)                                                 |
| `GET /students/:code/evaluations/stages?caseId&stage?` | Evaluation history                                                                |
| `POST /students/:code/assistance/hint`                 | Hint `{caseId, stage, requestId}` (`requestId` = idempotency key)                 |
| `GET /students/:code/assistance/history?caseId&stage`  | Hints for a stage + the next permitted level                                      |
| `POST /students/:code/evaluations/cases`               | Case evaluation + routing decision `{caseId}`                                     |
| `GET /students/:code/progress`                         | Snapshot, now including latest stage evaluations and routing decisions            |
| `GET /cases`                                           | Backend-owned case catalogue (id, number, support, title)                         |

`PUT /students/:code/cases/:caseId/progress` no longer trusts the client: a stage can only be added to
`completedStages` if stages before it are complete **and** the completion policy (including the 20/40 minimum) is
satisfied by the persisted evaluation of the current work (set `REQUIRE_EVALUATION_FOR_PROGRESS=false` only for development).

Errors use `{ error: { code, message, requestId, meta? } }`. New codes: `AI_NOT_CONFIGURED` (503),
`AI_TIMEOUT` (504), `AI_RATE_LIMITED` (503), `AI_UNAVAILABLE` (503), `AI_INVALID_RESPONSE` (502),
`STALE_ARTIFACT` (409), `INVALID_STATE` (409), `RATE_LIMITED` (429). A failed evaluation returns its id
in `error.meta.evaluationId`.

## Policies (all provisional)

**Rubric** (`config/rubric.ts`, `rubric-provisional-v1`): four indicators per stage, each scored
0–10 (max 40 per stage). The minimum to continue is the completion policy below.

**Stage completion** (`completion-provisional-v2`): the student may continue only when the latest evaluation is
`COMPLETED`, describes the current (unedited) work, does not flag insufficient evidence, **and scores at
least 20 of 40** (`STAGE_MIN_SCORE`, default 20; `0` disables the minimum). Below 20 the student still gets the
full feedback and can improve the work and press "Periksa jawaban" again; the earlier low evaluation stays as
history. The number 20 is a project decision but has not been validated against real student data.

**Micro scaffolding** (`assistance-provisional-v1`): every stage starts at L1. Each _real_ (non-fallback)
hint counts; the level rises one step per 2 hints (L1, L1, L2, L2, …), capped by the case's macro
support: HIGH → L5, MODERATE → L4, LOW → L3. Time and inactivity never escalate. Reduction of
assistance is not implemented; the `AssistancePolicy` interface is where it would go. Activity
evidence (hints so far, whether code exists, last run status) is stored with each hint for future
policies. L1–L3 hints containing code blocks are rejected by the app. If Gemini fails, a static
fallback is stored with status `FALLBACK`, shown as "Cadangan", and does not count towards escalation.

**Macro scaffolding** (`routing-provisional-v1`): Case 1 = HIGH → Case 2 = MODERATE → Case 3 = LOW.
After a case evaluation with sufficient evidence, `decideNextCase` returns the next case in order.
Missing or weak evidence → `HOLD_INSUFFICIENT_EVIDENCE`. Skipping Case 2 after Case 1 is implemented
but **off** unless `ROUTING_SKIP_MIN_RATIO` is set; a skipped case is stored as `SKIPPED`
(never `COMPLETED`) and a completed case is never overwritten. Help requests, hint levels and AI/technical
failures are deliberately **not** used as routing evidence.

**Case evaluation** (`case-evaluation-provisional-v1`): deterministic aggregation of the latest completed
evaluation of each stage (totals, strengths, improvements, missing stages). The score ratio is
descriptive only; no readiness or independence formula exists.

**Still undecided:** whether 20/40 is the right bar (and whether it should differ per stage or case), the weight of each stage, automatic escalation/reduction of
help, a readiness formula, what evidence justifies skipping a case, and the Case 1 → Case 3 skip ratio.

## Inspect stored records

```sql
select stage, status, attempt, "totalScore", "maxScore", "failureCategory", "rubricVersion", "modelName", "durationMs"
  from stage_evaluations order by "createdAt" desc limit 20;
select e.id, c."criterionKey", c.score, c.evidence from criterion_results c join stage_evaluations e on e.id = c."evaluationId" order by e."createdAt" desc limit 20;
select ar.kind, ar."revisionNumber", ar."contentHash" from evaluation_artifacts ea join artifact_revisions ar on ar.id = ea."artifactRevisionId" where ea."evaluationId" = '<id>';
select level, status, "assistanceType", "failureCategory", "policyVersion", left(content, 80) from assistance_interactions order by "createdAt" desc limit 20;
select status, "policyVersion", summary->'scoreRatio' from case_evaluations order by "createdAt" desc;
select "currentCaseId", "nextCaseId", "skippedCaseIds", status, reason, "policyVersion" from routing_decisions order by "createdAt" desc;
select "caseId", status from case_progress where status = 'SKIPPED';
```

## Troubleshooting Gemini

Check the API log (`docker compose logs -f api`): each operation logs `op`, entity ids, `status`,
`durationMs` and `failureCategory` (never prompts, student text or keys).

| Error code                         | Meaning                                                                                         | Fix                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `AI_NOT_CONFIGURED`                | no key, invalid key, key without access, or unknown `GEMINI_MODEL`                              | set a valid `GEMINI_API_KEY` / `GEMINI_MODEL`, restart the API, run `smoke:gemini` |
| `AI_RATE_LIMITED`                  | quota or 429 from Google                                                                        | wait; check quota; the student can retry                                           |
| `AI_TIMEOUT`                       | no answer within `AI_TIMEOUT_MS` (after retries)                                                | raise `AI_TIMEOUT_MS` (keep the BFF's 65 s budget in mind)                         |
| `AI_UNAVAILABLE`                   | network failure or 5xx from Google                                                              | check the VPS' outbound HTTPS; retry later                                         |
| `AI_INVALID_RESPONSE`              | output failed schema/rubric validation after retries                                            | retry; if persistent try another model                                             |
| `STALE_ARTIFACT` / `INVALID_STATE` | work changed, missing, or earlier stage not completed                                           | save and resubmit                                                                  |
| `RATE_LIMITED`                     | local anti-abuse limits (30 evaluations/h, 3 attempts per identical submission, 15 hints/stage) | wait / change the work                                                             |

A failed evaluation never unlocks anything and never counts against the student.

## Tests

- `pnpm --filter @skrp/api test` — policies, validation, error classification, prompts, and (with `TEST_DATABASE_URL`) the
  full persistence flows against PostgreSQL using a **fake model**. No Gemini call is made in automated tests.
- `pnpm --filter @skrp/web test` — BFF behavior.
- `web/e2e/ai-flow.mjs` — browser check of loading/success/failure/retry/stale/hint states against
  `api/tests/support/fakeAiServer.ts` (a test-only server with a controllable fake model).
- `pnpm --filter @skrp/api smoke:gemini` — the only check that uses the real Gemini API.

## Known limitations

- **No real authentication.** The student code identifies a record; anyone who knows it can use that student's
  evaluations and hints (and spend model quota). Rate limits reduce, not prevent, abuse.
- Browser-run results (code runs, test outcomes) are sent as **unverified evidence**; the model is told so.
- Case content (rules, tests) exists in two places: `api/src/config/cases.ts` (authoritative for AI and routing)
  and the web app's `mock-data.ts` (display). Keep ids, rules and tests in sync.
- There is no separate "learning session" table; progress is per student + case.
- Mock mode (`NEXT_PUBLIC_API_MODE=mock`) has no AI: the buttons are hidden and the hint card says it is an example.
- Stage 4 evaluation of "diagnosis and correction" sees the current code and the latest browser test outcomes, not a history of fixes.
