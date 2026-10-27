# PyScaffold

Media pembelajaran algoritma dan Python untuk kelas XII. Monorepo with two independent apps:

```
web/              Next.js 14 (App Router) frontend + thin BFF route handlers (src/app/api)
api/              Express 5 + TypeScript + Prisma + PostgreSQL (the only place Prisma is used)
packages/shared/  Type-only API contracts shared by web and api
docker-compose.yml  PostgreSQL + API (+ optional web) for a VPS
```

```
Browser ──► Next.js (Vercel) ──BFF /api/*──► Express API (VPS) ──Prisma──► PostgreSQL (container)
   └─ Pyodide runs student Python in the browser (no VPS involvement)
```

Package manager: **pnpm** (single root `pnpm-lock.yaml`, workspaces in `pnpm-workspace.yaml`).

## Local development

```bash
pnpm install

# Frontend only, no backend needed (mock mode is the default in `next dev`)
cp web/.env.example web/.env.local
pnpm dev:web                      # http://localhost:3000, mock codes: PY001 PY002 PY003
```

Full stack (real API + database):

```bash
# 1. a PostgreSQL you can reach, e.g. docker compose up -d db (then publish a port yourself) or a local install
cp api/.env.example api/.env      # set DATABASE_URL
cd api
pnpm exec prisma migrate deploy   # or `pnpm migrate:dev` while changing the schema
pnpm seed                         # idempotent: loads the class roster (api/prisma/roster.ts) as PY001-PY035
pnpm dev                          # http://localhost:4000

# 2. frontend in live mode: in web/.env.local set
#    NEXT_PUBLIC_API_MODE=live  API_INTERNAL_URL=http://localhost:4000
pnpm dev:web
```

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
API integration tests need a throwaway database: `TEST_DATABASE_URL=postgresql://... pnpm --filter @skrp/api test` (tables are truncated).

## Environment variables

| Variable | App | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | api | PostgreSQL connection string. In Docker the host is `db`, not `localhost`. |
| `PORT`, `NODE_ENV` | api | Listen port (4000); `production` enforces `INTERNAL_API_KEY`. |
| `INTERNAL_API_KEY` | api + web | Shared secret; the BFF sends it as `x-internal-key`. Required in production. |
| `ADMIN_API_KEY` | api | Enables roster endpoints (`x-admin-key`). Disabled when empty. |
| `CORS_ORIGINS` | api | Comma-separated browser origins. Empty = no CORS (correct when only the BFF calls the API). |
| `LOG_LEVEL`, `TRUST_PROXY` | api | Pino level; number of reverse proxies in front. |
| `NEXT_PUBLIC_API_MODE` | web | `mock` or `live`. Unset: `mock` in dev, `live` in production builds. Build-time. |
| `API_INTERNAL_URL` | web (server only) | Origin of the Express API used by the BFF. |
| `NEXT_PUBLIC_PYODIDE_INDEX_URL` | web | Optional Pyodide runtime URL. Default is the self-hosted copy at `/pyodide/` (copied from `node_modules` into `web/public/pyodide` by `predev`/`prebuild`); set it to e.g. the jsDelivr CDN to override. |

`NEXT_PUBLIC_API_BASE_URL` is intentionally absent: browsers only call same-origin `/api/*` on the Next.js app, so the API origin and key never reach client bundles. Root `.env.example` is for Docker Compose; see also `api/.env.example` and `web/.env.example`.

## Deploying the API + database on a VPS (Docker Compose)

Nothing here is run for you. On the VPS:

```bash
cp .env.example .env              # fill POSTGRES_PASSWORD (URL-safe), INTERNAL_API_KEY (openssl rand -hex 32), ADMIN_API_KEY
docker compose build
docker compose up -d db
docker compose run --rm migrate   # explicit step: prisma migrate deploy (never resets data)
docker compose up -d api
docker compose logs -f api        # logs
curl http://127.0.0.1:4000/health/ready
docker compose down               # stop (data stays in the pgdata volume; `down -v` would delete it)
```

- PostgreSQL has no published port and sits on an `internal` network only. The API binds to `127.0.0.1:4000`; put a TLS reverse proxy (Caddy/nginx) for your API domain in front of it.
- Update flow: `git pull && docker compose build && docker compose run --rm migrate && docker compose up -d api`.
- The production image does not include the seed script (it needs `tsx`). Load the roster into the VPS database by running `pnpm seed` from your machine with `DATABASE_URL` pointing at it (e.g. via an SSH tunnel), or use the import endpoint below.
- Optional frontend container: `docker compose --profile web up -d --build` (port 3000).

### Frontend on Vercel

Project Root Directory `web`, keep "include files outside root directory" enabled (needed for `packages/shared`). Set:
`NEXT_PUBLIC_API_MODE=live`, `API_INTERNAL_URL=https://py.telaahkarier.com`, `INTERNAL_API_KEY=<same value as in the VPS .env>`. Redeploy after changing them (`NEXT_PUBLIC_*` is baked in at build time).
Set `CORS_ORIGINS` only if you later call the API directly from browsers.

## Loading the real roster

Student codes are generated from the attendance number only (`1 → PY001`, `1000 → PY1000`; see `api/src/lib/studentCode.ts`). Names are nullable until supplied. Idempotent import (safe to re-run; omitted fields are left unchanged):

```bash
curl -X POST https://py.telaahkarier.com/api/students/import \
  -H "x-internal-key: $INTERNAL_API_KEY" -H "x-admin-key: $ADMIN_API_KEY" -H 'content-type: application/json' \
  -d '{"students":[{"attendanceNumber":1,"name":"...","className":"XII-1"}]}'
```

## API summary

`GET /health`, `GET /health/ready` (public). Under `/api` (needs `x-internal-key`):
`GET /students/:code`, `GET /students/:code/progress`, `PUT /students/:code/cases/:caseId/progress`, `PUT .../artifacts/:kind`, `POST .../code-revisions`. Admin (also `x-admin-key`): `GET|POST /students`, `POST /students/import`, `PATCH /students/:code`.
Responses are `{ data }` or `{ error: { code, message, details?, requestId } }`.

## Python editor

CodeMirror 6 editor, an `Input (stdin)` panel (one line per `input()` call), Run/Stop, and stdout/stderr/traceback output. Pyodide runs in a Web Worker; a run over 10 s is terminated. Each result stores the exact source and stdin that produced it and is marked stale when either changes. Code is autosaved (debounced) as append-only revisions; run metadata is attached only to the matching revision. Engine: `web/src/features/python-editor/`.

## Limitations

- **No real authentication.** A student code identifies a record; it is not a credential. Anyone who knows or guesses a code can read/write that student's progress through the site. Add real login/session before treating data as trustworthy.
- Browser-run results are client-reported, not verified evidence.
- Python: standard library only (no `micropip`/numpy loading); Pyodide is fetched from a CDN unless self-hosted.
- Case content lives in `web/src/lib/mock-data.ts` (`cases`): each case has a core task (`goal`, `rules`, `tests`, which drive the test stage) and a separate optional `exploration` (ideas for "strategi algoritmik"). Exploration is never graded, never blocks a stage or case, and does not affect routing; shared wording is in `web/src/lib/strategy-copy.ts`. The tariffs, shipping rates and fines in the rules are illustrative example numbers, not official figures.
- Case routing (1 → 2 → 3) and the assistant are still mock fixtures; the test stage runs the student's code in Pyodide against each case's `tests`. No AI is connected (`api/src/integrations/langchain/README.md` is a placeholder).
- Unsaved edits are flushed on navigation/continue, not on tab close.
- Mock mode stores data only in that browser's localStorage and is labelled `MODE: MOCK`.
