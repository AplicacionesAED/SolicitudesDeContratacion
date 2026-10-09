# syntax=docker/dockerfile:1
#
# Mismo patrón que Human-Resource-Management-System-AED/Dockerfile (familia
# aed, mismo stack backend+frontend): un solo contenedor final, el proceso de
# Express sirve también el build estático del frontend (ver
# backend/src/app.js) -- decisión explícita del corte a producción de esta
# migración (Fase 9): las rutas de API viven bajo /api/* precisamente para
# poder convivir en el mismo origen que las páginas del frontend sin chocar
# (ej. `GET /api/solicitudes/:id` vs. la página `/solicitudes/:id`).

# ---------- Stage 1: build frontend (Vite) ----------
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
# Vite incrusta las env VITE_* en el build en tiempo de COMPILACION, no de
# arranque -- a diferencia de PGHOST/JWT_SECRET/etc (backend, leídas recién
# al arrancar el proceso), esta SÍ hay que pasarla como --build-arg al
# construir la imagen para el dominio real de cada despliegue:
#   docker build --build-arg VITE_API_URL=https://indirectos.aed-it.com/api .
# El backend sirve el frontend bajo el mismo origen (ver app.js), así que en
# la mayoría de despliegues el valor real es "https://<tu-dominio>/api".
ARG VITE_API_URL=http://localhost:3021/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ---------- Stage 2: dependencias del backend (sin devDependencies) ----------
FROM node:20-slim AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev

# ---------- Stage final: imagen de ejecución ----------
FROM node:20-slim
WORKDIR /app

COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3021

ENTRYPOINT ["./entrypoint.sh"]
