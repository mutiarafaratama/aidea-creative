FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate
WORKDIR /app

FROM base AS deps
ENV CI=true
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/aidea-creative/package.json ./artifacts/aidea-creative/
RUN pnpm install --frozen-lockfile

FROM deps AS build-api
COPY tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
RUN pnpm --filter @workspace/api-server run build

FROM deps AS build-frontend
# Accept VITE_ build-time env vars as Docker build args
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_MIDTRANS_CLIENT_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_MIDTRANS_CLIENT_KEY=$VITE_MIDTRANS_CLIENT_KEY
ENV PORT=3000 BASE_PATH=/
COPY tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/aidea-creative/ ./artifacts/aidea-creative/
# Ensure the correct rollup native binary is available on glibc (slim) images
RUN apt-get update -qq && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/* || true
RUN pnpm add -D @rollup/rollup-linux-x64-gnu --filter @workspace/aidea-creative --ignore-workspace-root-check || true
RUN pnpm --filter @workspace/aidea-creative run build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/aidea-creative/package.json ./artifacts/aidea-creative/

RUN pnpm install --prod --no-optional --ignore-scripts

COPY --from=build-api /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build-frontend /app/artifacts/aidea-creative/dist ./artifacts/aidea-creative/dist

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
