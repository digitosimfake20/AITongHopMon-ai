# mathz-api — Hono skeleton for local Compose / future Render
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable pnpm
COPY services/api/package.json services/api/pnpm-lock.yaml services/api/pnpm-workspace.yaml ./
# --ignore-workspace: do not walk up to the Next.js monorepo root
RUN pnpm install --frozen-lockfile --ignore-workspace

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY services/api/package.json ./
COPY services/api/tsconfig.json ./
COPY services/api/src ./src
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 mathzapi

COPY --from=builder --chown=mathzapi:nodejs /app/package.json ./
COPY --from=builder --chown=mathzapi:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=mathzapi:nodejs /app/dist ./dist

USER mathzapi
EXPOSE 3001

CMD ["node", "dist/index.js"]
