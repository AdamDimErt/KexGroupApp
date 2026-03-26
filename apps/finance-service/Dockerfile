# ── Build stage ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* turbo.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/database/package.json packages/database/
COPY apps/finance-service/package.json apps/finance-service/

RUN npm ci --ignore-scripts

COPY packages/shared-types packages/shared-types
COPY packages/database packages/database
COPY apps/finance-service apps/finance-service

RUN cd packages/database && npx prisma generate
RUN npx turbo build --filter=finance-service

# ── Production stage ────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/finance-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/shared-types ./packages/shared-types

RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

CMD ["node", "dist/main.js"]
