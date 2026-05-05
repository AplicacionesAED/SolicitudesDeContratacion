# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ─── Stage 3: Runner ──────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 🔥 IMPORTANTE: copiar prisma y package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Next standalone
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 🔥 Ejecutar migración + seed antes de iniciar
CMD sh -c "echo DATABASE_URL=$DATABASE_URL && npx prisma generate && npx prisma db push && npx prisma db seed && node server.js"