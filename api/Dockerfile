# Build context is the repository root (the API lives in a pnpm workspace):
#   docker build -f api/Dockerfile -t skrp-api .
ARG NODE_VERSION=22

# ---- build ------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS build
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# Dependency layer: only manifests, so source edits do not bust the install cache.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY api/package.json api/
COPY packages/shared/package.json packages/shared/
COPY web/package.json web/
RUN pnpm install --frozen-lockfile --filter @skrp/api...

COPY packages/shared packages/shared
COPY api api
# prisma generate + tsc
RUN pnpm --filter @skrp/api build

# Production-only dependency tree, then generate the Prisma client inside it.
# (package.json `files` limits the deployed package to dist/ and prisma/.)
RUN pnpm --filter @skrp/api deploy --legacy --prod /deploy \
    && cd /deploy && node_modules/.bin/prisma generate --schema prisma/schema.prisma

# ---- runtime ----------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app
COPY --from=build --chown=node:node /deploy ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Migrations are NOT run here. Apply them explicitly: `docker compose run --rm migrate`.
CMD ["node", "dist/server.js"]
