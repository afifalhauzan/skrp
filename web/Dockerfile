# Build context is the repository root (the web app lives in a pnpm workspace):
#   docker build -f web/Dockerfile -t skrp-web .
ARG NODE_VERSION=22

# ---- build ------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY web/package.json web/
COPY packages/shared/package.json packages/shared/
COPY api/package.json api/
RUN pnpm install --frozen-lockfile --filter @skrp/web...

COPY packages/shared packages/shared
COPY web web

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they are
# build arguments. Server-only settings (API_INTERNAL_URL, INTERNAL_API_KEY) are read at
# runtime and must NOT be passed here.
ARG NEXT_PUBLIC_API_MODE=live
ARG NEXT_PUBLIC_PYODIDE_INDEX_URL=
ENV NEXT_PUBLIC_API_MODE=$NEXT_PUBLIC_API_MODE \
    NEXT_PUBLIC_PYODIDE_INDEX_URL=$NEXT_PUBLIC_PYODIDE_INDEX_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @skrp/web build

# ---- runtime ----------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
# Standalone output is rooted at the workspace root (see outputFileTracingRoot).
COPY --from=build --chown=node:node /repo/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/web/.next/static ./web/.next/static
COPY --from=build --chown=node:node /repo/web/public ./web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "web/server.js"]
