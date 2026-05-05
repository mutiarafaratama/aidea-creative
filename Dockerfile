FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY lib/ ./lib/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/aidea-creative/package.json ./artifacts/aidea-creative/
RUN pnpm install --frozen-lockfile

FROM deps AS build-api
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
RUN pnpm --filter @workspace/api-server run build

FROM deps AS build-frontend
COPY lib/ ./lib/
COPY artifacts/aidea-creative/ ./artifacts/aidea-creative/
ENV PORT=3000 BASE_PATH=/
RUN pnpm --filter @workspace/aidea-creative run build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY lib/ ./lib/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/aidea-creative/package.json ./artifacts/aidea-creative/

RUN pnpm install --frozen-lockfile --prod

COPY --from=build-api /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build-frontend /app/artifacts/aidea-creative/dist ./artifacts/aidea-creative/dist

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
