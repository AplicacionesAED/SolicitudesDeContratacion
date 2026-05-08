# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**App de Solicitudes de Indirectos — Baia Kristal**
Full-stack web app for managing indirect contracting requests. Located in `solicitudes-indirectos/`.

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript · Tailwind CSS v4
- **Prisma 7** with `@prisma/adapter-pg` (driver adapter required — NOT classic `prisma-client-js`)
- **next-auth v4** (JWT sessions, credentials provider)
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

**Prisma 7** requires a driver adapter — always instantiate with:
```typescript
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
new PrismaClient({ adapter });
```

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

Key permission slugs used in state transitions: `crear_enviar_solicitudes`, `aprobar_solicitudes_frente`, `revisar_contratos`, `registrar_adpro`, `aprobacion_final`.

### Roles and workflow

Roles: `SOLICITANTE` → `DIRECTOR_PROYECTO` → `CONTRATOS` → `CONTROLES` → `DIRECTOR_CONTROLES` → `ADMIN`

State machine (`src/app/api/solicitudes/[id]/estado/route.ts`):
```
BORRADOR → ENVIADA → EN_TRAMITE_CONTRATOS → CREACION_MINUTA → EN_CONTROLES → APROBACION_FINAL → COMPLETADA
                  ↘ DEVUELTA ↗ (reenviar)
                      EN_REVISION (contratos sends back for revision)
```

Action → destination state mapping lives in `ESTADO_DESTINO` inside the estado route and mirrored in `ACCION_ESTADO_DESTINO` in `utils.ts`. Any CONTROLES user (not just the assigned `coordinadorControlesId`) can execute `REGISTRAR_ADPRO`.

### Per-frente configuration (`AprobadorFrente`)

Each frente can have an `AprobadorFrente` record that pre-assigns:
- `aprobadorId` → Director de Proyecto (first approver)
- `contratosTramiteId` → Responsable Contratos (tramite)
- `contratosMinutaId` → Responsable Contratos (minuta)
- `controlesId` → Coordinador Controles (informational only — any CONTROLES user can act)
- `directorControlesId` → Director de Controles

When a solicitud is created, these IDs are copied onto the solicitud fields. If `aprobadorId` is not configured, the system falls back to any DIRECTOR_PROYECTO user assigned to that frente.

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
- **Visibility**: CONTRATOS / CONTROLES / DIRECTOR_CONTROLES / ADMIN see all solicitudes. DIRECTOR_PROYECTO and SOLICITANTE only see solicitudes where they are creator, approver, responsible, or the solicitud belongs to one of their assigned frentes.

### File uploads

Files saved to `public/uploads/` via `POST /api/upload`. Max 10 MB. Allowed: `.pdf`, `.xlsx`, `.xls`.

### Document generation

- Word (`.docx`): `POST /api/solicitudes/[id]/documento` — uses `docx` npm package
- Excel cronograma: `POST /api/solicitudes/cronograma/export` — uses `exceljs`

## Environment variables

Required in `.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/solicitudes_indirectos
NEXTAUTH_SECRET=<random 32-char secret>
NEXTAUTH_URL=http://localhost:3000
```

## Seed credentials

All seeded users have password `Abc123!` except admin (`Admin123!`):
- `smercado@baiak.com` — SOLICITANTE
- `crodriguez@baiak.com` — DIRECTOR_PROYECTO (KALIZA)
- `vtorres@baiak.com` — DIRECTOR_PROYECTO (KALA)
- `amorales@baiak.com` — CONTRATOS
- `ljimenez@baiak.com` — CONTROLES
- `msuarez@baiak.com` — DIRECTOR_CONTROLES
- `admin@baiak.com` — ADMIN
