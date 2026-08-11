@../SECURITY.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**App de Solicitudes de Indirectos — Baia Kristal**
Full-stack web app for managing indirect contracting requests. Located in `solicitudes-indirectos/`.

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript · Tailwind CSS v4
- **Prisma** with `@prisma/adapter-pg` (driver adapter required — NOT classic `prisma-client-js`). Note: `package.json` currently pins `prisma`/`@prisma/client` at `5.14.0` while `@prisma/adapter-pg`/`@prisma/adapter-libsql` are on the `^7.x` line — a version mismatch left over from an in-progress Prisma 7 migration. It works, but don't assume a clean Prisma 7 install when debugging client/type issues.
- **next-auth v4** (JWT sessions; Credentials provider + Azure AD/Microsoft Entra SSO provider)
- Generated Prisma client at `src/generated/prisma` — import from `@/generated/prisma`

## Commands

```bash
cd solicitudes-indirectos

# Development
npm run dev              # Start dev server (http://localhost:3000)

# Database
npm run db:generate      # Generate Prisma client after schema changes
npm run db:push          # Push schema to DB (no migrations — for dev)
npm run db:migrate       # Create and apply migration
npm run db:seed          # Seed DB with users, projects, frentes
npm run db:studio        # Open Prisma Studio
npm run setup            # generate + push + seed (first time)

# Build & lint
npm run build
npm run lint
```

## Architecture

### Directory layout

```
src/
  app/
    (app)/              # Authenticated route group — wrapped by AppLayout
      page.tsx          # Dashboard
      solicitudes/      # List, detail, new, edit
      terceros/         # Third-parties + due diligence
      configuracion/    # Users, approvers, frentes (ADMIN only)
      perfil/           # User profile
    api/                # API routes (Route Handlers)
      auth/[...nextauth]/
      solicitudes/
        [id]/estado/    # State machine transitions
        [id]/documento/ # Word .docx generation
        [id]/cronograma/
        cronograma/export/ # Excel export
      terceros/
      users/ · users/[id]/ · users/bulk/ · users/me/
      notificaciones/ · notificaciones/stream/  # SSE endpoint
      dashboard/stats/
      upload/
      config/aprobadores/
      frentes/ · proyectos/
    login/              # Standalone auth page
  components/
    layout/             # AppLayout, Providers, NotificacionesBell
    ui/                 # Badge, Button, Card, Input, Modal, Select, Spinner, Textarea, Toaster
    forms/              # CronogramaBuilder
    solicitudes/        # SolicitudActions, SolicitudBadge, EstadoTimeline
  lib/
    prisma.ts           # Prisma singleton (uses PrismaPg adapter)
    auth.ts             # NextAuth config (authOptions)
    utils.ts            # cn(), formatCurrency, formatDate, numeroALetras, labels/colors maps, tienePermiso()
    holidays.ts         # Colombia business days + holiday calculation
    notifications.ts    # In-app notification helpers (crearNotificacion + per-action helpers)
  generated/prisma/     # Auto-generated — never edit manually
  types/
    next-auth.d.ts      # Session type augmentation
```

### Key patterns

**Prisma driver adapter** — always instantiate with:
```typescript
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
new PrismaClient({ adapter });
```

**`.env` values containing `$`** (e.g. a bcrypt hash like `$2b$10$...`) get silently mangled — Next.js's env loader (`@next/env`, based on `dotenv-expand`) interpolates `$VAR` patterns. Escape every `$` as `\$` in `.env` or the value gets truncated with no error.

**`SessionProvider`** (`src/shared/layout/providers.tsx`) is configured with `refetchOnWindowFocus={false}`. Don't remove this — without it, `useSession()` returns a new object reference every time the browser tab regains focus, which retriggers any `useEffect` keyed on `session` and can silently reset in-progress form state (happened in the solicitud edit form).

**`$transaction` callbacks** — do NOT type `tx` as `typeof prisma`; let TypeScript infer it.

**Next.js 16 routes** — `params` is a Promise:
```typescript
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

**Auth in API routes**: `getServerSession(authOptions)` from `"next-auth"`.

**Client components** that need session: `useSession()` from `"next-auth/react"`.

### JSON string fields (critical gotcha)

Several model fields store arrays as JSON strings — always parse/stringify explicitly:

| Model | Field | Type stored |
|---|---|---|
| `Solicitud` | `frentesIds` | `JSON.stringify(number[])` |
| `User` | `roles` | `JSON.stringify(string[])` |
| `User` | `funcionalidadesAdicionales` | `JSON.stringify(string[])` |
| `Solicitud` | `archivosAnexos` | `JSON.stringify(string[])` |

Because `frentesIds` is a JSON string, Prisma cannot filter by frente membership in SQL — all frente-based filtering is done **in memory** after the DB query.

When PATCHing a record, only include fields that were actually provided in the request body. Use conditional spread to avoid overwriting unset fields:
```typescript
...(etapa !== undefined ? { etapa: etapa ? Number(etapa) : null } : {})
```

### Permission system

Permissions are checked with `tienePermiso(userRoles, funcionalidadesAdicionales, slug)` from `src/lib/utils.ts`. Each role has a base set of permissions (`FUNCIONALIDADES_POR_ROL`); `funcionalidadesAdicionales` on the User model allows granting extra slugs per user. ADMIN bypasses all checks.

Key permission slugs (`FUNCIONALIDADES_POR_ROL` in `utils.ts`, editable at runtime via the `Rol` table): `crear_enviar_solicitudes`, `crear_otrosi`, `crear_solicitudes_diseno`, `aprobar_director_tecnico`, `aprobar_solicitudes_frente`, `revisar_contratos`, `registrar_adpro`, `aprobacion_final`, `crear_terceros`, `gestionar_especialidades`.

Roles and their base permissions live in the `Rol` table (dynamic, admin-editable at `/configuracion/roles`); `FUNCIONALIDADES_POR_ROL` in `utils.ts` is only the fallback used when that table is empty. Don't assume the hardcoded map is authoritative — check the `Rol` table when debugging a permission issue.

### Roles and workflow

Roles: `SOLICITANTE`, `TECNICA`, `DIRECTOR_TECNICO`, `DIRECTOR_PROYECTO`, `CONTRATOS`, `CONTROLES`, `DIRECTOR_CONTROLES`, `GERENCIA` (view-only, no base permissions), `ADMIN` (bypasses all permission checks).

Main path: `SOLICITANTE`/`DIRECTOR_PROYECTO` → `CONTRATOS` → `CONTROLES` → `DIRECTOR_CONTROLES` → `ADMIN`. If the solicitante has the `TECNICA` role, `ENVIAR` routes through `DIRECTOR_TECNICO` approval first.

State machine (`src/app/api/solicitudes/[id]/estado/route.ts`) — full transition table lives in `TRANSICIONES`/`ESTADO_DESTINO` there, mirrored in `ACCION_ESTADO_DESTINO` in `utils.ts`:
```
BORRADOR --ENVIAR--> ENVIADA                              (default)
BORRADOR --ENVIAR--> PENDIENTE_DIRECTOR_TECNICO --APROBAR_DIRECTOR_TECNICO--> ENVIADA   (solicitante has role TECNICA)
ENVIADA --APROBAR_DIRECTOR--> EN_TRAMITE_CONTRATOS
EN_TRAMITE_CONTRATOS --TRAMITAR_OK--> CREACION_MINUTA
EN_TRAMITE_CONTRATOS --REVISAR--> EN_REVISION --REENVIAR--> ENVIADA   (solicitante original only)
CREACION_MINUTA --AVANZAR_CONTRATOS--> EN_CONTROLES        (requires ≥1 file in archivosAnexos)
EN_CONTROLES --REGISTRAR_ADPRO--> APROBACION_FINAL         (requires numeroContratoAdpro)
APROBACION_FINAL --APROBAR_FINAL--> COMPLETADA
[PENDIENTE_DIRECTOR_TECNICO | ENVIADA | EN_TRAMITE_CONTRATOS] --DEVOLVER--> DEVUELTA --REENVIAR--> ENVIADA   (solicitante original only)
```

Any CONTROLES user (not just the assigned `coordinadorControlesId`) can execute `REGISTRAR_ADPRO`. `DEVOLVER`/`REVISAR` require a non-empty `nota`.

`APROBADA_DIRECTOR` and `ENVIO_CONTRATO_POLIZAS` are valid states (they have labels/colors and are valid *origins* for `REVISAR`/`TRAMITAR_OK`/`PASAR_CONTROLES`) but no current transition produces them as a *destination* — they're orphaned, likely leftover from an earlier version of the flow. Don't build new logic assuming a solicitud can reach them through normal use.

### Per-frente configuration (`AprobadorFrente`)

Each frente can have an `AprobadorFrente` record. Unlike a single approver, most fields are **JSON arrays of user IDs** — any user in the array can act:
- `aprobadorIds` → Director de Proyecto (first approvers, array)
- `contratosTramiteIds` → Responsable Contratos, trámite (array)
- `contratosMinutaIds` → Responsable Contratos, minuta (array)
- `controlesId` → Coordinador Controles (single ID, informational only — any CONTROLES user can act regardless)
- `directorControlesIds` → Director de Controles (array)

When a solicitud is created, the relevant ID from these arrays is copied onto the solicitud's single-value fields (`aprobadorId`, `responsableContratosTramiteId`, etc.). If `aprobadorIds` is empty, the system falls back to any DIRECTOR_PROYECTO user assigned to that frente. When checking "is this user allowed to act", the estado route checks both the solicitud's copied single ID *and* whether the user is present in the frente's configured array — don't assume the single ID on the solicitud is the only source of truth.

### Consecutivo format

Format: `SOL-{TIPO_ABREV}-{PROY_ABBR}-{FRENTE_NORMALIZED}-{NNN}`

- `TIPO_ABREV`: `ODS`, `CONT`, `OST`, `OSTC`, `TCC`, `TFC`, `TCR`, `TCO`, `TBC`
- `PROY_ABBR`: from `Proyecto.codigoConsecutivo` if set, else first 3 letters of proyecto name
- `FRENTE_NORMALIZED`: full frente name uppercased, spaces/accents stripped (e.g. `"KALA 1"` → `"KALA1"`)
- Counter key: `{TIPO_ABREV}-{PROY_ABBR}-{FRENTE_NORMALIZED}` in `ContadorConsecutivo`

Generated transactionally via `prisma.$transaction` + `ContadorConsecutivo.upsert`.

### Real-time notifications

- **Creating**: use helpers from `src/lib/notifications.ts` (e.g. `notificarNuevaSolicitud`, `notificarCompletada`). Each wraps `crearNotificacion(userId, titulo, mensaje, url)`.
- **Delivery**: `NotificacionesBell` in the layout opens an SSE connection to `/api/notificaciones/stream`. The stream polls the DB every 10 s and pushes `{ totalNoLeidas: N }` only when the count changes; otherwise sends a `: ping` heartbeat. Auto-reconnects on error after 15 s.

### Business rules

- **Cronograma**: `fechaInicio` must be ≥ 13 business days from today (Colombia holidays via `src/lib/holidays.ts`)
- **Terceros**: only appear in solicitud dropdown when `aprobadoDebidaDiligencia = true` (all 6 DD boolean checks set)
- **Timezone**: always `America/Bogota` (UTC-5)
- **Visibility**: driven by `Rol.verTodasSolicitudes` (dynamic, checked via `getRolesVerTodas()` in `src/lib/roles.ts`) — roles with that flag see all solicitudes. Fallback if the `Rol` table is empty: `CONTRATOS`, `CONTROLES`, `DIRECTOR_CONTROLES`, `DIRECTOR_TECNICO`, `GERENCIA`, `ADMIN`. Everyone else (typically `SOLICITANTE`, `DIRECTOR_PROYECTO`, `TECNICA`) only sees solicitudes where they are creator, approver, responsible, or the solicitud belongs to one of their assigned frentes. Note `/api/presence` uses its own narrower hardcoded list for a different (dashboard stats) purpose — don't assume it matches `getRolesVerTodas()`.

### File uploads

`POST /api/upload` saves to `UPLOADS_DIR` (defaults to `public/uploads/` in dev; set to a mounted persistent volume path, e.g. `/app/data/uploads`, in production — see Dockerfile). Max **20 MB**. Uses a **blocklist**, not an allowlist: only dangerous executable extensions are rejected (`.exe .bat .cmd .sh .ps1 .msi .dll .com .vbs .scr .pif`) — everything else (including `.docx`, `.csv`, images) is accepted. Filenames are sanitized and timestamp-prefixed. Files are served back through `GET /api/files/[filename]`, which requires an authenticated session — not a raw static path.

### Document generation

- Word (`.docx`): `POST /api/solicitudes/[id]/documento` — uses `docx` npm package
- Excel cronograma: `POST /api/solicitudes/cronograma/export` — uses `exceljs`

## Environment variables

Required in `.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/solicitudes_indirectos
NEXTAUTH_SECRET=<random 32-char secret>
NEXTAUTH_URL=http://localhost:3000
AZURE_TENANT_ID=<Azure AD tenant>       # SSO login + Microsoft account-linking flow
AZURE_CLIENT_ID=<Azure AD app id>
AZURE_CLIENT_SECRET=<Azure AD app secret>
SHAREPOINT_FILE_ID=<Excel file ID>      # terceros sync from SharePoint via Graph API
```

Optional:
- `MASTER_KEY_HASH` — bcrypt hash of an emergency master password. If set, `authorize()` in `auth.ts` accepts it as a fallback for *any* user's login without touching that user's own password (logs `[MASTER_KEY_LOGIN]` on use). Remember to escape `$` as `\$` when writing the hash into `.env` (see gotcha above).
- `UPLOADS_DIR` — persistent uploads path in production (see File uploads above).

Present in some `.env` files but **unused in current code** — safe to ignore/remove if found: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `SHAREPOINT_SITE_ID` (the Microsoft account-link flow reuses the `AZURE_*` vars; the SharePoint site ID is resolved dynamically per sync, not read from env).

## Documentación técnica

Existe una documentación técnica completa del proyecto en `~/Desktop/documentaciones/Documentacion-Tecnica-Solicitudes-Indirectos.md` (fuera de este repositorio). Cubre arquitectura, esquema de base de datos, despliegue, seguridad, métricas y troubleshooting, basada en revisión directa del código (no en suposiciones).

**Cuando hagas cambios relevantes al proyecto** (nuevos modelos o campos en `schema.prisma`, nuevas rutas de API, cambios en el flujo de estados de `Solicitud`, cambios en autenticación/permisos, cambios en el `Dockerfile` o variables de entorno, o al resolver alguno de los "problemas conocidos" listados en ese documento), actualiza la sección correspondiente de ese archivo para que seguido refleje la realidad del código. No hace falta regenerarlo por completo — edita solo las secciones afectadas.

## Seed credentials

All seeded users have password `Abc123!` except admin (`Admin123!`):
- `smercado@baiak.com` — SOLICITANTE
- `crodriguez@baiak.com` — DIRECTOR_PROYECTO (KALIZA)
- `vtorres@baiak.com` — DIRECTOR_PROYECTO (KALA)
- `amorales@baiak.com` — CONTRATOS
- `ljimenez@baiak.com` — CONTROLES
- `msuarez@baiak.com` — DIRECTOR_CONTROLES
- `admin@baiak.com` — ADMIN
