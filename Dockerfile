# syntax=docker/dockerfile:1.28

# --- Build the app -------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# --- Runtime dependencies only --------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# --- Runtime -----------------------------------------------------------------------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8787
COPY --from=deps /app/node_modules node_modules
COPY package.json ./
# Node runs the server's TypeScript directly; the demo module provides the sample videos.
COPY server/ server/
COPY demo/ demo/
COPY --from=build /app/dist dist
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server/main.ts"]
