# ── Build stage ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json* turbo.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/database/package.json packages/database/
COPY apps/auth-service/package.json apps/auth-service/

# Install dependencies
RUN npm ci --ignore-scripts

# Copy source code
COPY packages/shared-types packages/shared-types
COPY packages/database packages/database
COPY apps/auth-service apps/auth-service

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build shared packages + service
RUN npx turbo build --filter=auth-service

# ── Production stage ────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built artifacts
COPY --from=builder /app/apps/auth-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/shared-types ./packages/shared-types

# Non-root user
RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/main.js"]
