# syntax=docker/dockerfile:1
# Multi-stage: npm + BuildKit cache mounts (npm cache, Turbo, Prisma engines) for faster rebuilds.
# Production: use docker/production/compose.yml (Postgres + Redis + application); do not use all-in-one for new deploys.
###########################
#     BASE CONTAINER      #
###########################
FROM node:22-alpine3.22 AS base

RUN apk add --no-cache openssl
RUN apk add --no-cache font-freefont

###########################
#    BUILDER CONTAINER    #
###########################
FROM base AS builder

RUN apk add --no-cache libc6-compat jq
WORKDIR /app

COPY . .

RUN npm install -g "turbo@^1.9.3"
RUN turbo prune --scope=@documenso/remix --docker

###########################
#   INSTALLER CONTAINER   #
###########################
FROM base AS installer

RUN apk add --no-cache libc6-compat jq
RUN apk add --no-cache make cmake g++ openssl bash

WORKDIR /app

ENV HUSKY=0
ENV DOCKER_OUTPUT=1
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PRIVATE_ENCRYPTION_KEY="CAFEBABE"
ENV NEXT_PRIVATE_ENCRYPTION_KEY="$NEXT_PRIVATE_ENCRYPTION_KEY"

ARG NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY="DEADBEEF"
ENV NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY="$NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY"

ARG NEXT_PRIVATE_TELEMETRY_KEY=""
ENV NEXT_PRIVATE_TELEMETRY_KEY="$NEXT_PRIVATE_TELEMETRY_KEY"

ARG NEXT_PRIVATE_TELEMETRY_HOST=""
ENV NEXT_PRIVATE_TELEMETRY_HOST="$NEXT_PRIVATE_TELEMETRY_HOST"

# Optional remote cache (CI): docker build --build-arg TURBO_TEAM=... --build-arg TURBO_TOKEN=...
ARG TURBO_TEAM
ARG TURBO_TOKEN
ENV TURBO_TEAM=$TURBO_TEAM
ENV TURBO_TOKEN=$TURBO_TOKEN

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json

COPY --from=builder /app/lingui.config.ts ./lingui.config.ts
COPY --from=builder /app/.npmrc ./.npmrc

RUN --mount=type=cache,id=npm,target=/root/.npm \
  npm ci

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

RUN --mount=type=cache,target=/app/.turbo \
  --mount=type=cache,id=npm,target=/root/.npm \
  --mount=type=cache,id=prisma-engines,target=/root/.cache/prisma \
  npx turbo run build --filter=@documenso/remix...

###########################
#     RUNNER CONTAINER    #
###########################
FROM base AS runner

ENV HUSKY=0
ENV DOCKER_OUTPUT=1

ARG NEXT_PRIVATE_TELEMETRY_KEY=""
ENV NEXT_PRIVATE_TELEMETRY_KEY="$NEXT_PRIVATE_TELEMETRY_KEY"

ARG NEXT_PRIVATE_TELEMETRY_HOST=""
ENV NEXT_PRIVATE_TELEMETRY_HOST="$NEXT_PRIVATE_TELEMETRY_HOST"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/out/json/ .
COPY --from=builder --chown=nodejs:nodejs /app/out/package-lock.json ./package-lock.json
COPY --from=builder --chown=nodejs:nodejs /app/.npmrc ./.npmrc
COPY --from=builder --chown=nodejs:nodejs /app/out/full/packages/tailwind-config ./packages/tailwind-config

USER root
RUN --mount=type=cache,id=npm,target=/root/.npm \
  npm ci --omit=dev && \
  chown -R nodejs:nodejs /app

USER nodejs

COPY --from=installer --chown=nodejs:nodejs /app/apps/remix/build ./apps/remix/build
COPY --from=installer --chown=nodejs:nodejs /app/apps/remix/public ./apps/remix/public

COPY --from=installer --chown=nodejs:nodejs /app/packages/prisma/schema.prisma ./packages/prisma/schema.prisma
COPY --from=installer --chown=nodejs:nodejs /app/packages/prisma/migrations ./packages/prisma/migrations

RUN --mount=type=cache,id=prisma-engines,target=/home/nodejs/.cache/prisma \
  npx prisma generate --schema ./packages/prisma/schema.prisma

COPY --chown=nodejs:nodejs ./docker/start.sh /app/apps/remix/start.sh

WORKDIR /app/apps/remix

CMD ["sh", "start.sh"]

###########################
# ALL-IN-ONE (legacy)     #
###########################
FROM runner AS all-in-one

USER root

RUN apk add --no-cache postgresql postgresql-contrib \
  && rm -rf /var/cache/apk/*

COPY docker/start-all-in-one.sh /start-all-in-one.sh
RUN chmod +x /start-all-in-one.sh

CMD ["/bin/sh", "/start-all-in-one.sh"]

# Default image for `docker build` with no --target (runner app only; not all-in-one).
FROM runner
