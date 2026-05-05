# =========================
# 1. BUILD STAGE (glibc)
# =========================
FROM node:22-slim AS builder

WORKDIR /app

# Aktifkan pnpm
RUN corepack enable

# Copy semua file
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build frontend (Vite)
RUN pnpm --filter @workspace/aidea-creative build

# Build backend (kalau ada build step)
RUN pnpm --filter @workspace/api-server build || echo "No backend build step"

# =========================
# 2. RUNNER STAGE (ringan)
# =========================
FROM node:22-alpine AS runner

WORKDIR /app

# Install pnpm juga di runner
RUN corepack enable

# Copy hasil build dari builder
COPY --from=builder /app /app

# Set environment
ENV NODE_ENV=production

# Railway pakai PORT
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start backend (Express)
CMD ["pnpm", "--filter", "@workspace/api-server", "start"]
