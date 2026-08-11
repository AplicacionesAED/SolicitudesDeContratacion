# Importar contrato/otrosí histórico — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a solicitante register a contrato/trámite or un otrosí anterior a este sistema (ya completado en papel/Excel) como una `Solicitud` en estado `COMPLETADA`, preservando su número real de otrosí, para poder crear otrosís nuevos y reales sobre él.

**Architecture:** Un endpoint nuevo (`POST /api/solicitudes/importar-historico`) separado del flujo normal de creación, con dos modos (`CONTRATO` / `OTROSI`), reutilizando la generación de consecutivo existente (extraída a un helper compartido) y el permiso `crear_enviar_solicitudes` (+ `crear_otrosi` para el modo `OTROSI`, igual que la creación real de otrosí). Un formulario nuevo (`ImportarHistoricoForm`) alcanzable desde el Paso 1 de `OtrosiForm`. Marca visual (`HistoricoBadge`) en lista/detalle, y un banner de reemplazo en `EstadoTimeline` para no mostrar un stepper de aprobación engañoso.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma + PostgreSQL, next-auth v4, Tailwind CSS v4, Jest + ts-jest.

## Global Constraints

- No se crea un permiso nuevo: modo `CONTRATO` requiere `crear_enviar_solicitudes`; modo `OTROSI` requiere además `crear_otrosi` (igual que la creación real de otrosí).
- Tipos elegibles en modo `CONTRATO`: `CONTRATO`, `TRAMITE_CUENTA`, `TRAMITE_FACTURAS`, `TRAMITE_CUENTAS_RECURRENTES`, `TRAMITE_CUENTAS_OCASIONALES`, `TRAMITE_BONIFICACIONES_COMISIONES` — nunca `ORDEN_SERVICIO` (no admite otrosí, confirmado como regla de negocio intencional).
- El chequeo de "contrato vencido" (fechaFin en el pasado) NO se aplica en la importación — es esperado registrar historial vencido.
- `numeroOtrosi` en modo `OTROSI` es un valor que el usuario declara libremente, sin validación de unicidad/orden contra otros otrosís del mismo padre.
- El consecutivo se genera siempre automáticamente (nunca lo escribe el usuario).
- Spec completo: `docs/superpowers/specs/2026-08-05-importar-historico-design.md`.

---

### Task 1: Esquema — campos `importadoHistorico` y `numeroOtrosi`

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Solicitud.importadoHistorico: boolean` (default `false`), `Solicitud.numeroOtrosi: number | null` — usados por todas las tareas siguientes.

- [ ] **Step 1: Agregar los campos al modelo `Solicitud`**

En `prisma/schema.prisma`, dentro del modelo `Solicitud`, justo debajo de `numeroContratoAdpro String?` (antes de `estado String @default("BORRADOR")`):

```prisma
  notaContratacion    String?
  necesitaRevision    Boolean  @default(false)
  numeroContratoAdpro String?

  importadoHistorico  Boolean  @default(false)
  numeroOtrosi        Int?

  estado    String @default("BORRADOR") // EstadoSolicitud enum stored as string
```

- [ ] **Step 2: Aplicar el cambio a la base de datos**

Run (desde `solicitudes-indirectos/`):
```bash
npm run db:push
npm run db:generate
```
Expected: ambos comandos terminan sin error; el segundo regenera `src/generated/prisma` con los nuevos campos tipados.

- [ ] **Step 3: Verificar las columnas nuevas directamente en la base**

Run:
```bash
node -e "
const { Client } = require('pg');
const fs = require('fs');
const url = fs.readFileSync('.env','utf8').split('\n').find(l=>l.startsWith('DATABASE_URL=')).slice('DATABASE_URL='.length).trim();
const client = new Client({ connectionString: url });
client.connect().then(async () => {
  const r = await client.query(\`SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'Solicitud' AND column_name IN ('importadoHistorico','numeroOtrosi')\`);
  console.log(r.rows);
  await client.end();
});
"
```
Expected: dos filas — `importadoHistorico` (`boolean`, default `false`) y `numeroOtrosi` (`integer`, sin default).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): add importadoHistorico and numeroOtrosi fields to Solicitud"
```

---

### Task 2: Extraer generación de consecutivo a un helper compartido

**Files:**
- Create: `src/lib/consecutivo.ts`
- Modify: `src/app/api/solicitudes/route.ts:4` (imports), `:276-291` (rama otrosí), `:413-424` (rama normal)

**Interfaces:**
- Produces: `resolveConsecutivoAbbrs(proyectoId: number, firstFrenteId: number | undefined): Promise<{ proyAbbr: string; frenAbbr: string }>` — usado por la rama normal, la rama de otrosí (ya existentes) y por el endpoint de importación (Task 5).
- Consumes: `abbreviate`, `normalizeFrenteName` de `@/lib/utils` (ya existen, sin cambios).

- [ ] **Step 1: Crear el helper**

Create `src/lib/consecutivo.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { abbreviate, normalizeFrenteName } from "@/lib/utils";

/**
 * Resuelve las abreviaturas de proyecto y frente usadas para construir el
 * consecutivo de una Solicitud (ej. "SOL-CONT-BK-KALA1-003"). Compartido por
 * la creación normal, la creación de otrosí y la importación histórica —
 * las tres necesitan exactamente la misma regla de abreviación.
 */
export async function resolveConsecutivoAbbrs(
  proyectoId: number,
  firstFrenteId: number | undefined
): Promise<{ proyAbbr: string; frenAbbr: string }> {
  const [proyectoData, frenteData] = await Promise.all([
    prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { nombre: true, codigoConsecutivo: true },
    }),
    firstFrenteId
      ? prisma.frente.findUnique({ where: { id: firstFrenteId }, select: { nombre: true } })
      : Promise.resolve(null),
  ]);

  const proyAbbr =
    proyectoData?.codigoConsecutivo?.trim() ||
    abbreviate(proyectoData?.nombre ?? String(proyectoId), 3);
  const frenAbbr = normalizeFrenteName(frenteData?.nombre ?? String(firstFrenteId ?? ""));

  return { proyAbbr, frenAbbr };
}
```

- [ ] **Step 2: Usar el helper en la rama normal de `POST /api/solicitudes`**

En `src/app/api/solicitudes/route.ts`, reemplazar (alrededor de la línea 413):

```ts
    // Fetch proyecto and frente names for the consecutivo abbreviation
    const [proyectoData, frenteData] = await Promise.all([
      prisma.proyecto.findUnique({ where: { id: Number(proyectoId) }, select: { nombre: true, codigoConsecutivo: true } }),
      prisma.frente.findUnique({ where: { id: Number(firstFrenteId) }, select: { nombre: true } }),
    ]);

    // Use hardcoded code if set, otherwise auto-abbreviate to 3 chars
    const proyAbbr = proyectoData?.codigoConsecutivo?.trim()
      || abbreviate(proyectoData?.nombre ?? String(proyectoId), 3);
    // Full frente name uppercased with no spaces (e.g. "KALA 1" → "KALA1")
    const frenAbbr = normalizeFrenteName(frenteData?.nombre ?? String(firstFrenteId));
```

por:

```ts
    const { proyAbbr, frenAbbr } = await resolveConsecutivoAbbrs(Number(proyectoId), Number(firstFrenteId));
```

- [ ] **Step 3: Usar el helper en la rama de otrosí**

En el mismo archivo, reemplazar (alrededor de la línea 276):

```ts
      const [proyectoData, frenteData] = await Promise.all([
        prisma.proyecto.findUnique({
          where: { id: parent.proyectoId },
          select: { nombre: true, codigoConsecutivo: true },
        }),
        firstFrenteId
          ? prisma.frente.findUnique({ where: { id: firstFrenteId }, select: { nombre: true } })
          : Promise.resolve(null),
      ]);

      const proyAbbr =
        proyectoData?.codigoConsecutivo?.trim() ||
        abbreviate(proyectoData?.nombre ?? String(parent.proyectoId), 3);
      const frenAbbr = frenteData
        ? normalizeFrenteName(frenteData.nombre)
        : String(firstFrenteId ?? "");
```

por:

```ts
      const { proyAbbr, frenAbbr } = await resolveConsecutivoAbbrs(parent.proyectoId, firstFrenteId);
```

- [ ] **Step 4: Limpiar imports que ya no se usan directamente en `route.ts`**

`abbreviate` y `normalizeFrenteName` ya no se llaman directamente en este archivo (ahora viven en `consecutivo.ts`). En la línea 4, cambiar:

```ts
import { buildConsecutivo, abbreviate, normalizeFrenteName, tienePermiso } from "@/lib/utils";
```

por:

```ts
import { buildConsecutivo, tienePermiso } from "@/lib/utils";
```

y agregar debajo:

```ts
import { resolveConsecutivoAbbrs } from "@/lib/consecutivo";
```

- [ ] **Step 5: Verificar que TypeScript compila**

Run: `npx tsc --noEmit`
Expected: sin errores (en particular, sin "unused import" ni "cannot find name proyectoData/frenteData" residuales).

- [ ] **Step 6: Verificación manual — el consecutivo no cambió de formato**

Con el servidor de desarrollo corriendo (`npm run dev`), inicia sesión como un usuario `SOLICITANTE` (ej. `smercado@baiak.com` / `Abc123!`) y crea una solicitud nueva de tipo Contrato hasta el paso de guardar borrador. Verifica en la respuesta (o en la lista de solicitudes) que el consecutivo sigue el formato `SOL-CONT-{PROY}-{FRENTE}-{NNN}` igual que antes del refactor.

- [ ] **Step 7: Commit**

```bash
git add src/lib/consecutivo.ts src/app/api/solicitudes/route.ts
git commit -m "refactor: extract consecutivo abbreviation lookup into shared helper"
```

---

### Task 3: Numeración automática de otrosí (`numeroOtrosi`)

**Files:**
- Create: `src/lib/otrosi.ts`
- Create: `src/lib/__tests__/otrosi.test.ts`
- Modify: `src/app/api/solicitudes/route.ts` (rama de otrosí — agregar cálculo e incluirlo en `tx.solicitud.create`)

**Interfaces:**
- Produces: `nextNumeroOtrosi(existing: (number | null | undefined)[]): number` — usado por la rama de otrosí en `route.ts`. No lo usa el endpoint de importación (ahí el número lo declara el usuario manualmente).

- [ ] **Step 1: Escribir el test (falla primero)**

Create `src/lib/__tests__/otrosi.test.ts`:

```ts
import { nextNumeroOtrosi } from "@/lib/otrosi";

describe("nextNumeroOtrosi", () => {
  it("returns 1 when there are no previous otrosís", () => {
    expect(nextNumeroOtrosi([])).toBe(1);
  });

  it("returns 1 when all entries are null", () => {
    expect(nextNumeroOtrosi([null, null])).toBe(1);
  });

  it("returns one more than the highest known number", () => {
    expect(nextNumeroOtrosi([1, 2, 3])).toBe(4);
  });

  it("ignores null entries mixed with numbers", () => {
    expect(nextNumeroOtrosi([null, 4, null])).toBe(5);
  });

  it("handles a historical import with a gap (only #4 was ever registered)", () => {
    expect(nextNumeroOtrosi([4])).toBe(5);
  });

  it("does not assume the input array is sorted", () => {
    expect(nextNumeroOtrosi([3, 1, 4, 1, 5])).toBe(6);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npx jest src/lib/__tests__/otrosi.test.ts`
Expected: FAIL — `Cannot find module '@/lib/otrosi'`.

- [ ] **Step 3: Implementar la función**

Create `src/lib/otrosi.ts`:

```ts
/**
 * Calcula el número de secuencia de un otrosí nuevo a partir de los
 * numeroOtrosi ya registrados para su padre (otrosís nativos creados por la
 * app, y otrosís históricos registrados por importación). Ignora entradas
 * null/undefined — corresponden a otrosís creados antes de que este campo
 * existiera, o sin número histórico conocido.
 */
export function nextNumeroOtrosi(existing: (number | null | undefined)[]): number {
  const known = existing.filter((n): n is number => typeof n === "number");
  if (known.length === 0) return 1;
  return Math.max(...known) + 1;
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `npx jest src/lib/__tests__/otrosi.test.ts`
Expected: PASS — 6 tests verdes.

- [ ] **Step 5: Usar la función en la rama de otrosí de `POST /api/solicitudes`**

En `src/app/api/solicitudes/route.ts`, agregar el import:

```ts
import { nextNumeroOtrosi } from "@/lib/otrosi";
```

Justo antes de `const solicitud = await prisma.$transaction(async (tx) => {` en la rama de otrosí (alrededor de la línea 302), agregar:

```ts
      const hermanos = await prisma.solicitud.findMany({
        where: { solicitudPadreId: parent.id },
        select: { numeroOtrosi: true },
      });
      const numeroOtrosi = nextNumeroOtrosi(hermanos.map((h) => h.numeroOtrosi));
```

Y dentro de `tx.solicitud.create({ data: { ... } })` de esa misma rama, agregar el campo `numeroOtrosi,` (por ejemplo justo debajo de `solicitudPadreId: parent.id,`):

```ts
        const created = await tx.solicitud.create({
          data: {
            consecutivo,
            tipo,
            solicitudPadreId: parent.id,
            numeroOtrosi,
            proyectoId: parent.proyectoId,
```

- [ ] **Step 6: Verificación manual**

Con el servidor corriendo, crea un otrosí real sobre cualquier contrato `COMPLETADA` existente (flujo normal, `/solicitudes/nueva/otrosi-tiempo`). Verifica en la base de datos que el registro creado tiene `numeroOtrosi = 1` (si es el primer otrosí de ese contrato):

```bash
node -e "
const { Client } = require('pg');
const fs = require('fs');
const url = fs.readFileSync('.env','utf8').split('\n').find(l=>l.startsWith('DATABASE_URL=')).slice('DATABASE_URL='.length).trim();
const client = new Client({ connectionString: url });
client.connect().then(async () => {
  const r = await client.query('SELECT id, consecutivo, \"solicitudPadreId\", \"numeroOtrosi\" FROM \"Solicitud\" WHERE tipo LIKE \'OTROSI%\' ORDER BY id DESC LIMIT 5');
  console.log(r.rows);
  await client.end();
});
"
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/otrosi.ts src/lib/__tests__/otrosi.test.ts src/app/api/solicitudes/route.ts
git commit -m "feat: auto-number otrosís sequentially per parent contract"
```

---

### Task 4: Labels de historial para `IMPORTAR_HISTORICO`

**Files:**
- Modify: `src/lib/utils.ts` (`ACCION_LABELS`, `ACCION_COLOR`, `ACCION_ESTADO_DESTINO`)

- [ ] **Step 1: Agregar las tres entradas**

En `src/lib/utils.ts`, en `ACCION_LABELS` (después de `REENVIAR: "Solicitud reenviada para aprobación",`):

```ts
  REENVIAR: "Solicitud reenviada para aprobación",
  IMPORTAR_HISTORICO: "Registro histórico importado",
```

En `ACCION_COLOR` (después de `REENVIAR: "bg-blue-400",`):

```ts
  REENVIAR: "bg-blue-400",
  IMPORTAR_HISTORICO: "bg-gray-400",
```

En `ACCION_ESTADO_DESTINO` (después de `REENVIAR: "ENVIADA",`):

```ts
  REENVIAR: "ENVIADA",
  IMPORTAR_HISTORICO: "COMPLETADA",
```

- [ ] **Step 2: Verificar que TypeScript compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add historial labels for IMPORTAR_HISTORICO action"
```

---

### Task 5: Endpoint `POST /api/solicitudes/importar-historico`

**Files:**
- Create: `src/app/api/solicitudes/importar-historico/route.ts`

**Interfaces:**
- Consumes: `resolveConsecutivoAbbrs` (Task 2), `tienePermiso`, `buildConsecutivo`, `numeroALetras` de `@/lib/utils`.
- Produces: `POST /api/solicitudes/importar-historico` — body `{ modo: "CONTRATO" | "OTROSI", tipo, terceroId?, proyectoId?, frentesIds?, solicitudPadreId?, numeroOtrosi?, valorFinal?, fechaInicio, fechaFin }` → `201` con la `Solicitud` creada (incluye `id`, usado por el frontend para redirigir). Usado por `ImportarHistoricoForm` (Task 6).

- [ ] **Step 1: Crear el endpoint**

Create `src/app/api/solicitudes/importar-historico/route.ts`:

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tienePermiso, buildConsecutivo, numeroALetras } from "@/lib/utils";
import { resolveConsecutivoAbbrs } from "@/lib/consecutivo";

const TIPOS_CONTRATO_HISTORICO = [
  "CONTRATO",
  "TRAMITE_CUENTA",
  "TRAMITE_FACTURAS",
  "TRAMITE_CUENTAS_RECURRENTES",
  "TRAMITE_CUENTAS_OCASIONALES",
  "TRAMITE_BONIFICACIONES_COMISIONES",
];
const TIPOS_OTROSI_HISTORICO = ["OTROSI_TIEMPO", "OTROSI_TIEMPO_CANTIDAD"];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const userRoles: string[] = session.user.roles ?? [session.user.rol];
    const funcionalidadesAdicionales: string[] = session.user.funcionalidadesAdicionales ?? [];

    if (!tienePermiso(userRoles, funcionalidadesAdicionales, "crear_enviar_solicitudes")) {
      return Response.json(
        { error: "No tienes permiso para importar solicitudes históricas." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      modo,
      tipo,
      terceroId,
      proyectoId,
      frentesIds,
      valorFinal,
      fechaInicio,
      fechaFin,
      solicitudPadreId,
      numeroOtrosi: numeroOtrosiInput,
    } = body;

    if (modo !== "CONTRATO" && modo !== "OTROSI") {
      return Response.json({ error: "modo debe ser CONTRATO u OTROSI" }, { status: 400 });
    }

    if (!fechaInicio || !fechaFin) {
      return Response.json({ error: "fechaInicio y fechaFin son obligatorios" }, { status: 400 });
    }
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return Response.json({ error: "Fechas inválidas" }, { status: 400 });
    }
    if (fin <= inicio) {
      return Response.json({ error: "fechaFin debe ser posterior a fechaInicio" }, { status: 400 });
    }

    // ── Modo OTROSI ──────────────────────────────────────────────────────────
    if (modo === "OTROSI") {
      if (!tienePermiso(userRoles, funcionalidadesAdicionales, "crear_otrosi")) {
        return Response.json(
          { error: "No tienes permiso para importar otrosís históricos." },
          { status: 403 }
        );
      }
      if (!tipo || !TIPOS_OTROSI_HISTORICO.includes(tipo)) {
        return Response.json({ error: "Tipo inválido para otrosí histórico" }, { status: 400 });
      }
      if (!solicitudPadreId) {
        return Response.json({ error: "solicitudPadreId es obligatorio en modo OTROSI" }, { status: 400 });
      }
      const numeroOtrosiManual = Number(numeroOtrosiInput);
      if (!numeroOtrosiInput || isNaN(numeroOtrosiManual) || numeroOtrosiManual <= 0) {
        return Response.json({ error: "numeroOtrosi debe ser un entero positivo" }, { status: 400 });
      }

      const parent = await prisma.solicitud.findUnique({ where: { id: Number(solicitudPadreId) } });
      if (!parent) {
        return Response.json({ error: "Solicitud padre no encontrada" }, { status: 404 });
      }
      if (parent.tipo === "ORDEN_SERVICIO") {
        return Response.json({ error: "Las Órdenes de Servicio no admiten otrosí" }, { status: 400 });
      }
      if (parent.estado !== "COMPLETADA") {
        return Response.json(
          { error: "Solo se pueden importar otrosís de solicitudes en estado COMPLETADA" },
          { status: 400 }
        );
      }

      const activeOtrosi = await prisma.solicitud.findFirst({
        where: { solicitudPadreId: parent.id, estado: { not: "COMPLETADA" } },
        select: { consecutivo: true },
      });
      if (activeOtrosi) {
        return Response.json(
          {
            error: `Ya existe un otrosí activo para este contrato (${activeOtrosi.consecutivo}). Debe completarse antes de importar uno nuevo.`,
          },
          { status: 400 }
        );
      }

      const lastCompletedOtrosi = await prisma.solicitud.findFirst({
        where: { solicitudPadreId: parent.id, estado: "COMPLETADA" },
        orderBy: { creadoEn: "desc" },
        select: { valorFinal: true, valorEnLetras: true },
      });
      const baseline = lastCompletedOtrosi ?? parent;

      const finalValorFinal =
        tipo === "OTROSI_TIEMPO_CANTIDAD" && valorFinal != null ? Number(valorFinal) : baseline.valorFinal;
      const finalValorEnLetras =
        tipo === "OTROSI_TIEMPO_CANTIDAD" && valorFinal != null
          ? numeroALetras(Number(valorFinal))
          : baseline.valorEnLetras;

      const parentFrentesIds: number[] = (() => {
        try { return JSON.parse(parent.frentesIds || "[]"); } catch { return []; }
      })();
      const firstFrenteId = parentFrentesIds[0];
      const { proyAbbr, frenAbbr } = await resolveConsecutivoAbbrs(parent.proyectoId, firstFrenteId);

      const solicitud = await prisma.$transaction(async (tx) => {
        const key = `${tipo}-${proyAbbr}-${frenAbbr}`;
        const counter = await tx.contadorConsecutivo.upsert({
          where: { tipo: key },
          update: { ultimo: { increment: 1 } },
          create: { tipo: key, anio: new Date().getFullYear(), ultimo: 1 },
        });
        const consecutivo = buildConsecutivo(tipo, proyAbbr, frenAbbr, counter.ultimo);

        const created = await tx.solicitud.create({
          data: {
            consecutivo,
            tipo,
            solicitudPadreId: parent.id,
            numeroOtrosi: numeroOtrosiManual,
            proyectoId: parent.proyectoId,
            frentesIds: parent.frentesIds,
            solicitanteId: session.user.id,
            aprobadorId: parent.aprobadorId ?? null,
            responsableContratosTramiteId: parent.responsableContratosTramiteId ?? null,
            responsableContratosMinutaId: parent.responsableContratosMinutaId ?? null,
            coordinadorControlesId: parent.coordinadorControlesId ?? null,
            directorControlesId: parent.directorControlesId ?? null,
            estado: "COMPLETADA",
            importadoHistorico: true,
            terceroId: parent.terceroId ?? null,
            descripcionActividad: parent.descripcionActividad ?? null,
            plazoEjecucion: parent.plazoEjecucion ?? null,
            formaPago: parent.formaPago ?? null,
            valorFinal: finalValorFinal ?? null,
            valorEnLetras: finalValorEnLetras ?? null,
            tipoContrato: parent.tipoContrato ?? null,
            asunto: parent.asunto ?? null,
            contratanteNombre: parent.contratanteNombre ?? "AED CONSTRUCTORES S.A.S",
            contratanteNit: parent.contratanteNit ?? "901237628-1",
            cronograma: {
              create: {
                tieneFases: false,
                fechaInicio: inicio,
                fechaFin: fin,
              },
            },
          },
        });

        await tx.historialSolicitud.create({
          data: {
            solicitudId: created.id,
            usuarioId: session.user.id,
            accion: "IMPORTAR_HISTORICO",
            nota: `Otrosí histórico (n.º ${numeroOtrosiManual}) importado por ${session.user.name ?? "un usuario"}.`,
          },
        });

        return created;
      });

      return Response.json(solicitud, { status: 201 });
    }

    // ── Modo CONTRATO ────────────────────────────────────────────────────────
    if (!tipo || !TIPOS_CONTRATO_HISTORICO.includes(tipo)) {
      return Response.json({ error: "Tipo inválido para contrato histórico" }, { status: 400 });
    }
    if (!terceroId || !proyectoId || !Array.isArray(frentesIds) || frentesIds.length === 0) {
      return Response.json(
        { error: "terceroId, proyectoId y frentesIds son obligatorios" },
        { status: 400 }
      );
    }

    const firstFrenteId = frentesIds[0];
    const { proyAbbr, frenAbbr } = await resolveConsecutivoAbbrs(Number(proyectoId), Number(firstFrenteId));
    const valorEnLetras = valorFinal != null ? numeroALetras(Number(valorFinal)) : null;

    const solicitud = await prisma.$transaction(async (tx) => {
      const key = `${tipo}-${proyAbbr}-${frenAbbr}`;
      const counter = await tx.contadorConsecutivo.upsert({
        where: { tipo: key },
        update: { ultimo: { increment: 1 } },
        create: { tipo: key, anio: new Date().getFullYear(), ultimo: 1 },
      });
      const consecutivo = buildConsecutivo(tipo, proyAbbr, frenAbbr, counter.ultimo);

      const created = await tx.solicitud.create({
        data: {
          consecutivo,
          tipo,
          proyectoId: Number(proyectoId),
          frentesIds: JSON.stringify(frentesIds),
          solicitanteId: session.user.id,
          estado: "COMPLETADA",
          importadoHistorico: true,
          terceroId: Number(terceroId),
          valorFinal: valorFinal != null ? Number(valorFinal) : null,
          valorEnLetras,
          cronograma: {
            create: {
              tieneFases: false,
              fechaInicio: inicio,
              fechaFin: fin,
            },
          },
        },
      });

      await tx.historialSolicitud.create({
        data: {
          solicitudId: created.id,
          usuarioId: session.user.id,
          accion: "IMPORTAR_HISTORICO",
          nota: `Contrato histórico importado por ${session.user.name ?? "un usuario"}.`,
        },
      });

      return created;
    });

    return Response.json(solicitud, { status: 201 });
  } catch (error) {
    console.error("POST /api/solicitudes/importar-historico error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verificar que TypeScript compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación manual — modo CONTRATO con curl**

Con el servidor corriendo y una sesión de navegador autenticada (copia el valor de la cookie `next-auth.session-token` desde las devtools del navegador tras iniciar sesión):

```bash
curl -X POST http://localhost:3000/api/solicitudes/importar-historico \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=PEGA_AQUI_EL_VALOR" \
  -d '{
    "modo": "CONTRATO",
    "tipo": "CONTRATO",
    "terceroId": 1,
    "proyectoId": 1,
    "frentesIds": [1],
    "valorFinal": 5000000,
    "fechaInicio": "2024-01-15",
    "fechaFin": "2024-12-15"
  }'
```

Expected: `201` con un JSON que incluye `"estado":"COMPLETADA"`, `"importadoHistorico":true`, y un `consecutivo` con el formato `SOL-CONT-...`. Ajusta `terceroId`/`proyectoId`/`frentesIds` a valores que existan en tu base (verifica con `GET /api/terceros` y `GET /api/frentes`).

- [ ] **Step 4: Verificación manual — modo OTROSI con curl**

Usa el `id` de cualquier solicitud existente en estado `COMPLETADA` (por ejemplo, la que acabas de crear en el Step 3):

```bash
curl -X POST http://localhost:3000/api/solicitudes/importar-historico \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=PEGA_AQUI_EL_VALOR" \
  -d '{
    "modo": "OTROSI",
    "tipo": "OTROSI_TIEMPO_CANTIDAD",
    "solicitudPadreId": ID_DEL_CONTRATO,
    "numeroOtrosi": 4,
    "valorFinal": 6000000,
    "fechaInicio": "2024-12-01",
    "fechaFin": "2025-06-15"
  }'
```

Expected: `201` con `"solicitudPadreId": ID_DEL_CONTRATO`, `"numeroOtrosi": 4`, `"estado": "COMPLETADA"`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/solicitudes/importar-historico/route.ts
git commit -m "feat: add historical contract/otrosí import endpoint"
```

---

### Task 6: Formulario `ImportarHistoricoForm` + página

**Files:**
- Create: `src/features/solicitudes/components/importarHistoricoForm.tsx`
- Create: `src/app/(app)/solicitudes/importar-historico/page.tsx`

**Interfaces:**
- Consumes: `POST /api/solicitudes/importar-historico` (Task 5), `GET /api/frentes`, `GET /api/terceros?aprobado=true`, `GET /api/solicitudes?estado=COMPLETADA`.

- [ ] **Step 1: Crear el componente**

Create `src/features/solicitudes/components/importarHistoricoForm.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { useToast } from "@/shared/ui/toaster";
import { TIPO_SOLICITUD_LABELS } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Frente {
  id: number;
  nombre: string;
  proyectoId: number;
  proyecto: { id: number; nombre: string };
}

interface Tercero {
  id: number;
  razonSocial: string;
  nit: string;
}

interface SolicitudRow {
  id: number;
  consecutivo: string;
  tipo: string;
  tercero?: { razonSocial: string } | null;
}

type Modo = "CONTRATO" | "OTROSI";

const TIPOS_CONTRATO = [
  "CONTRATO",
  "TRAMITE_CUENTA",
  "TRAMITE_FACTURAS",
  "TRAMITE_CUENTAS_RECURRENTES",
  "TRAMITE_CUENTAS_OCASIONALES",
  "TRAMITE_BONIFICACIONES_COMISIONES",
];
const TIPOS_OTROSI = ["OTROSI_TIEMPO", "OTROSI_TIEMPO_CANTIDAD"];

const TIPO_CONTRATO_OPTIONS = TIPOS_CONTRATO.map((t) => ({
  value: t,
  label: TIPO_SOLICITUD_LABELS[t] ?? t,
}));
const TIPO_OTROSI_OPTIONS = TIPOS_OTROSI.map((t) => ({
  value: t,
  label: TIPO_SOLICITUD_LABELS[t] ?? t,
}));

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportarHistoricoForm() {
  const router = useRouter();
  const { addToast } = useToast();

  const [modo, setModo] = useState<Modo>("CONTRATO");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Campos compartidos
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [valorFinal, setValorFinal] = useState("");

  // Modo CONTRATO
  const [tipoContrato, setTipoContrato] = useState("");
  const [frentes, setFrentes] = useState<Frente[]>([]);
  const [frenteId, setFrenteId] = useState("");
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [terceroId, setTerceroId] = useState("");

  // Modo OTROSI
  const [tipoOtrosi, setTipoOtrosi] = useState("OTROSI_TIEMPO");
  const [padres, setPadres] = useState<SolicitudRow[]>([]);
  const [loadingPadres, setLoadingPadres] = useState(true);
  const [padreSearch, setPadreSearch] = useState("");
  const [selectedPadre, setSelectedPadre] = useState<SolicitudRow | null>(null);
  const [numeroOtrosi, setNumeroOtrosi] = useState("");

  useEffect(() => {
    fetch("/api/frentes")
      .then((r) => r.json())
      .then((data) => setFrentes(Array.isArray(data) ? data : []))
      .catch(() => setFrentes([]));

    fetch("/api/terceros?aprobado=true")
      .then((r) => r.json())
      .then((data) => setTerceros(Array.isArray(data) ? data : []))
      .catch(() => setTerceros([]));

    fetch("/api/solicitudes?estado=COMPLETADA")
      .then((r) => r.json())
      .then((data) =>
        setPadres(
          Array.isArray(data) ? data.filter((s: SolicitudRow) => s.tipo !== "ORDEN_SERVICIO") : []
        )
      )
      .catch(() => setPadres([]))
      .finally(() => setLoadingPadres(false));
  }, []);

  const filteredPadres = padres.filter((p) => {
    const q = padreSearch.toLowerCase();
    return (
      p.consecutivo.toLowerCase().includes(q) ||
      (p.tercero?.razonSocial ?? "").toLowerCase().includes(q)
    );
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!fechaInicio) next.fechaInicio = "La fecha de inicio es obligatoria.";
    if (!fechaFin) next.fechaFin = "La fecha de fin es obligatoria.";
    if (fechaInicio && fechaFin && new Date(fechaFin) <= new Date(fechaInicio)) {
      next.fechaFin = "La fecha de fin debe ser posterior a la de inicio.";
    }

    if (modo === "CONTRATO") {
      if (!tipoContrato) next.tipoContrato = "Selecciona el tipo.";
      if (!frenteId) next.frenteId = "Selecciona el frente.";
      if (!terceroId) next.terceroId = "Selecciona el tercero.";
    } else {
      if (!selectedPadre) next.selectedPadre = "Selecciona el contrato al que pertenece.";
      const n = parseInt(numeroOtrosi, 10);
      if (!numeroOtrosi || isNaN(n) || n <= 0) next.numeroOtrosi = "Ingresa un número de otrosí válido.";
      if (tipoOtrosi === "OTROSI_TIEMPO_CANTIDAD" && !valorFinal) {
        next.valorFinal = "Ingresa el nuevo valor del contrato.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const body =
        modo === "CONTRATO"
          ? {
              modo,
              tipo: tipoContrato,
              terceroId: Number(terceroId),
              proyectoId: frentes.find((f) => f.id === Number(frenteId))?.proyectoId,
              frentesIds: [Number(frenteId)],
              valorFinal: valorFinal ? Number(valorFinal) : null,
              fechaInicio,
              fechaFin,
            }
          : {
              modo,
              tipo: tipoOtrosi,
              solicitudPadreId: selectedPadre!.id,
              numeroOtrosi: Number(numeroOtrosi),
              valorFinal: valorFinal ? Number(valorFinal) : null,
              fechaInicio,
              fechaFin,
            };

      const res = await fetch("/api/solicitudes/importar-historico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast(data.error ?? "Error al importar el registro histórico", "error");
        return;
      }

      addToast("Registro histórico importado correctamente", "success");
      router.push(`/solicitudes/${data.id}`);
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <Link
          href="/solicitudes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Importar registro histórico</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Registra un contrato o un otrosí anterior a este sistema, ya completado, para
          poder crear otrosís reales sobre él.
        </p>
      </div>

      {/* Selector de modo */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">¿Qué vas a importar?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setModo("CONTRATO")}
            className={`text-left rounded-lg border p-4 transition-colors ${
              modo === "CONTRATO" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">Un contrato o trámite original</p>
            <p className="text-xs text-gray-500 mt-0.5">No existe todavía en el sistema.</p>
          </button>
          <button
            type="button"
            onClick={() => setModo("OTROSI")}
            className={`text-left rounded-lg border p-4 transition-colors ${
              modo === "OTROSI" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">Un otrosí de un contrato existente</p>
            <p className="text-xs text-gray-500 mt-0.5">
              El contrato ya está en el sistema (nativo o importado).
            </p>
          </button>
        </div>
      </div>

      {modo === "CONTRATO" ? (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <Select
            label="Tipo"
            required
            placeholder="Selecciona un tipo"
            options={TIPO_CONTRATO_OPTIONS}
            value={tipoContrato}
            onChange={(e) => setTipoContrato(e.target.value)}
            error={errors.tipoContrato}
          />
          <Select
            label="Frente"
            required
            placeholder="Selecciona un frente"
            options={frentes.map((f) => ({
              value: String(f.id),
              label: `${f.nombre} — ${f.proyecto.nombre}`,
            }))}
            value={frenteId}
            onChange={(e) => setFrenteId(e.target.value)}
            error={errors.frenteId}
          />
          <Select
            label="Tercero"
            required
            placeholder="Selecciona un tercero"
            options={terceros.map((t) => ({ value: String(t.id), label: `${t.razonSocial} — ${t.nit}` }))}
            value={terceroId}
            onChange={(e) => setTerceroId(e.target.value)}
            error={errors.terceroId}
          />
          <Input
            label="Valor final (COP)"
            type="number"
            min={0}
            value={valorFinal}
            onChange={(e) => setValorFinal(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de inicio"
              type="date"
              required
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              error={errors.fechaInicio}
            />
            <Input
              label="Fecha de fin"
              type="date"
              required
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              error={errors.fechaFin}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Contrato base <span className="text-red-500">*</span>
            </label>
            {selectedPadre ? (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <div>
                  <p className="text-sm font-mono font-semibold text-blue-700">
                    {selectedPadre.consecutivo}
                  </p>
                  <p className="text-xs text-gray-500">{selectedPadre.tercero?.razonSocial ?? "—"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPadre(null)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={padreSearch}
                      onChange={(e) => setPadreSearch(e.target.value)}
                      placeholder="Buscar por consecutivo o tercero..."
                      className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {loadingPadres ? (
                  <div className="flex items-center justify-center py-6">
                    <Spinner size="sm" />
                  </div>
                ) : filteredPadres.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-6">
                    No hay contratos completados disponibles.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                    {filteredPadres.map((p) => (
                      <li
                        key={p.id}
                        onClick={() => setSelectedPadre(p)}
                        className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-blue-50"
                      >
                        <span className="font-mono font-semibold text-blue-600">{p.consecutivo}</span>
                        <span className="text-xs text-gray-500">{p.tercero?.razonSocial ?? "—"}</span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {errors.selectedPadre && <p className="text-xs text-red-500 mt-1">{errors.selectedPadre}</p>}
          </div>

          <Select
            label="Tipo de otrosí"
            required
            options={TIPO_OTROSI_OPTIONS}
            value={tipoOtrosi}
            onChange={(e) => setTipoOtrosi(e.target.value)}
          />
          <Input
            label="Número de otrosí"
            type="number"
            min={1}
            required
            placeholder="Ej. 4"
            value={numeroOtrosi}
            onChange={(e) => setNumeroOtrosi(e.target.value)}
            error={errors.numeroOtrosi}
          />
          {tipoOtrosi === "OTROSI_TIEMPO_CANTIDAD" && (
            <Input
              label="Nuevo valor del contrato (COP)"
              type="number"
              min={0}
              required
              value={valorFinal}
              onChange={(e) => setValorFinal(e.target.value)}
              error={errors.valorFinal}
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de inicio"
              type="date"
              required
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              error={errors.fechaInicio}
            />
            <Input
              label="Fecha de fin"
              type="date"
              required
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              error={errors.fechaFin}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/solicitudes">
          <Button variant="secondary" disabled={submitting}>
            Cancelar
          </Button>
        </Link>
        <Button loading={submitting} onClick={handleSubmit}>
          Importar
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear la página**

Create `src/app/(app)/solicitudes/importar-historico/page.tsx`:

```tsx
import { ImportarHistoricoForm } from "@/features/solicitudes/components/importarHistoricoForm";

export default function ImportarHistoricoPage() {
  return <ImportarHistoricoForm />;
}
```

- [ ] **Step 3: Verificar que TypeScript compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Verificación manual en el navegador**

Con `npm run dev` corriendo, entra a `http://localhost:3000/solicitudes/importar-historico` como un usuario con permiso `crear_enviar_solicitudes` (ej. `smercado@baiak.com`). Prueba:
- Modo "Un contrato o trámite original": llena todos los campos y guarda. Debe redirigir a `/solicitudes/{id}` del registro creado.
- Modo "Un otrosí de un contrato existente": selecciona el contrato recién creado como base, pon `numeroOtrosi = 4`, tipo `Otrosí Tiempo, Cantidad y/o Modificación`, un valor nuevo, y fechas. Debe redirigir igual.
- Deja algún campo obligatorio vacío y confirma que aparece el mensaje de error correspondiente sin enviar la petición.

- [ ] **Step 5: Commit**

```bash
git add src/features/solicitudes/components/importarHistoricoForm.tsx "src/app/(app)/solicitudes/importar-historico/page.tsx"
git commit -m "feat: add ImportarHistoricoForm and its page"
```

---

### Task 7: Enlace de descubrimiento desde `OtrosiForm`

**Files:**
- Modify: `src/features/solicitudes/components/otrosiForm.tsx:294-297`

- [ ] **Step 1: Agregar el enlace en el Paso 1**

En `src/features/solicitudes/components/otrosiForm.tsx`, reemplazar:

```tsx
          <p className="text-sm text-gray-500 mt-0.5">
            Selecciona el contrato base al que se aplica este otrosí.
          </p>
        </div>
```

por:

```tsx
          <p className="text-sm text-gray-500 mt-0.5">
            Selecciona el contrato base al que se aplica este otrosí.
          </p>
          <Link
            href="/solicitudes/importar-historico"
            className="inline-block mt-2 text-xs text-blue-600 hover:underline"
          >
            ¿El contrato o el otrosí es anterior a este sistema? Impórtalo aquí →
          </Link>
        </div>
```

(El import de `Link` desde `"next/link"` ya existe en la parte superior del archivo — no hace falta agregarlo.)

- [ ] **Step 2: Verificación manual**

Entra a `/solicitudes/nueva/otrosi-tiempo` (o `otrosi-tiempo-cantidad`) y confirma que el enlace aparece bajo el título, y que al hacer clic navega a `/solicitudes/importar-historico`.

- [ ] **Step 3: Commit**

```bash
git add src/features/solicitudes/components/otrosiForm.tsx
git commit -m "feat: link to historical import from the otrosí parent picker"
```

---

### Task 8: Insignia "Importado" en lista y detalle

**Files:**
- Create: `src/features/solicitudes/components/historicoBadge.tsx`
- Modify: `src/app/(app)/solicitudes/page.tsx` (interfaz `SolicitudRow`, filas padre e hija)
- Modify: `src/app/(app)/solicitudes/[id]/page.tsx` (encabezado)

**Interfaces:**
- Produces: `HistoricoBadge({ numeroOtrosi?: number | null; className?: string })` — componente de presentación puro, usado por ambas páginas.

- [ ] **Step 1: Crear el componente**

Create `src/features/solicitudes/components/historicoBadge.tsx`:

```tsx
import { History } from "lucide-react";

interface HistoricoBadgeProps {
  numeroOtrosi?: number | null;
  className?: string;
}

export function HistoricoBadge({ numeroOtrosi, className = "" }: HistoricoBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 justify-center
        rounded-full px-2.5 py-0.5
        text-xs font-medium leading-tight whitespace-nowrap
        bg-amber-50 text-amber-700 border border-amber-200
        ${className}
      `}
    >
      <History size={11} className="shrink-0" />
      {numeroOtrosi ? `Otrosí histórico #${numeroOtrosi}` : "Importado"}
    </span>
  );
}
```

- [ ] **Step 2: Extender la interfaz `SolicitudRow` en la lista**

En `src/app/(app)/solicitudes/page.tsx`, en la interfaz `SolicitudRow` (alrededor de la línea 23), agregar dos campos opcionales:

```ts
interface SolicitudRow {
  id: number;
  consecutivo: string;
  tipo: string;
  frentesIds: number[];
  proyectoId: number;
  tercero?: { razonSocial: string; nit: string } | null;
  solicitante: { nombre: string };
  valorFinal?: number | string | null;
  estado: string;
  fechaSolicitud: string;
  _count?: { otrosis: number };
  importadoHistorico?: boolean;
  numeroOtrosi?: number | null;
}
```

- [ ] **Step 3: Importar `HistoricoBadge` y usarlo en la fila padre**

Agregar el import junto al de `SolicitudBadge` (línea 11):

```ts
import { SolicitudBadge } from "@/features/solicitudes/components/solicitudBadge";
import { HistoricoBadge } from "@/features/solicitudes/components/historicoBadge";
```

Reemplazar (alrededor de la línea 461):

```tsx
                        <td className="px-4 py-3 whitespace-nowrap">
                          <SolicitudBadge estado={sol.estado} />
                        </td>
```

por:

```tsx
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <SolicitudBadge estado={sol.estado} />
                            {sol.importadoHistorico && <HistoricoBadge numeroOtrosi={sol.numeroOtrosi} />}
                          </div>
                        </td>
```

- [ ] **Step 4: Usarlo también en la fila de otrosí hijo**

Reemplazar (alrededor de la línea 522):

```tsx
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <SolicitudBadge estado={child.estado} />
                              </td>
```

por:

```tsx
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <SolicitudBadge estado={child.estado} />
                                  {child.importadoHistorico && (
                                    <HistoricoBadge numeroOtrosi={child.numeroOtrosi} />
                                  )}
                                </div>
                              </td>
```

- [ ] **Step 5: Usarlo en el encabezado del detalle**

En `src/app/(app)/solicitudes/[id]/page.tsx`, agregar el import junto al de `SolicitudBadge` (línea 21):

```ts
import { SolicitudBadge } from "@/features/solicitudes/components/solicitudBadge";
import { HistoricoBadge } from "@/features/solicitudes/components/historicoBadge";
```

Reemplazar (alrededor de la línea 210):

```tsx
            <SolicitudBadge estado={solicitud.estado} />
```

por:

```tsx
            <SolicitudBadge estado={solicitud.estado} />
            {solicitud.importadoHistorico && <HistoricoBadge numeroOtrosi={solicitud.numeroOtrosi} />}
```

- [ ] **Step 6: Verificar que TypeScript compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Verificación manual**

Con los registros creados en la verificación del Task 6, confirma en `/solicitudes` (fila padre y, al expandir, la fila del otrosí) y en el detalle de cada uno (`/solicitudes/{id}`) que aparece la insignia ámbar "Importado" / "Otrosí histórico #4" junto al estado, y que las solicitudes normales (no históricas) no muestran nada adicional.

- [ ] **Step 8: Commit**

```bash
git add src/features/solicitudes/components/historicoBadge.tsx "src/app/(app)/solicitudes/page.tsx" "src/app/(app)/solicitudes/[id]/page.tsx"
git commit -m "feat: show a badge for historically-imported solicitudes"
```

---

### Task 9: Aviso en `EstadoTimeline` y verificación final de extremo a extremo

**Files:**
- Modify: `src/features/solicitudes/components/estadoTimeline.tsx`
- Modify: `src/app/(app)/solicitudes/[id]/page.tsx:219`

**Interfaces:**
- Consumes: `solicitud.importadoHistorico`, `solicitud.numeroOtrosi` (Task 1).

- [ ] **Step 1: Agregar el ícono y las props nuevas**

En `src/features/solicitudes/components/estadoTimeline.tsx`, agregar `History` a los imports de `lucide-react` (línea 1-13):

```ts
import {
  Send,
  CheckCircle,
  FileText,
  PenLine,
  ClipboardCheck,
  ThumbsUp,
  Star,
  RotateCcw,
  Eye,
  UserCheck,
  Minus,
  History,
} from "lucide-react";
```

Extender `EstadoTimelineProps` (alrededor de la línea 24):

```ts
interface EstadoTimelineProps {
  estadoActual: string;
  historial?: HistorialEntry[];
  importadoHistorico?: boolean;
  numeroOtrosi?: number | null;
}
```

- [ ] **Step 2: Mostrar el aviso en lugar del stepper cuando es histórico**

Reemplazar la firma del componente y su primera línea (alrededor de la línea 104):

```tsx
export function EstadoTimeline({
  estadoActual,
  historial = [],
}: EstadoTimelineProps) {
  const isSideState = SIDE_STATES.includes(estadoActual);
```

por:

```tsx
export function EstadoTimeline({
  estadoActual,
  historial = [],
  importadoHistorico = false,
  numeroOtrosi,
}: EstadoTimelineProps) {
  if (importadoHistorico) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Progreso del flujo</h3>
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">
          <History size={14} />
          <span>
            {numeroOtrosi
              ? `Otrosí histórico #${numeroOtrosi} — importado sin flujo de aprobación.`
              : "Contrato histórico — importado sin flujo de aprobación."}
          </span>
        </div>
      </div>
    );
  }

  const isSideState = SIDE_STATES.includes(estadoActual);
```

(El resto del componente, desde `isSideState` en adelante, queda sin cambios.)

- [ ] **Step 3: Pasar las props nuevas desde el detalle**

En `src/app/(app)/solicitudes/[id]/page.tsx`, reemplazar (línea 219):

```tsx
      <EstadoTimeline estadoActual={solicitud.estado} historial={historial} />
```

por:

```tsx
      <EstadoTimeline
        estadoActual={solicitud.estado}
        historial={historial}
        importadoHistorico={solicitud.importadoHistorico}
        numeroOtrosi={solicitud.numeroOtrosi}
      />
```

- [ ] **Step 4: Verificar que TypeScript compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Verificación manual — banner en el detalle**

Abre el detalle de un registro importado (Task 6). Confirma que en la sección "Progreso del flujo" aparece el aviso ámbar en vez del stepper de pasos, con el texto correcto ("Contrato histórico..." o "Otrosí histórico #4...").

- [ ] **Step 6: Verificación de extremo a extremo (checklist completo del spec)**

Con el servidor corriendo:

1. Importa un contrato histórico (`modo CONTRATO`) → confirma que aparece disponible en el Paso 1 de `OtrosiForm` (`/solicitudes/nueva/otrosi-tiempo`) para crear un otrosí real.
2. Importa un otrosí histórico (`modo OTROSI`, número 4) sobre ese mismo contrato → confirma en la base de datos que quedó con `solicitudPadreId` correcto y `numeroOtrosi = 4`.
3. Ahora crea un otrosí **real** (flujo normal, no importado) sobre ese mismo contrato → confirma que su `numeroOtrosi` sale automáticamente en `5`.
4. Intenta importar otro otrosí histórico sobre un contrato que ya tiene un otrosí activo (no completado) → debe rechazarse con el mismo mensaje que ya existe para la creación real.
5. Intenta importar sobre un contrato que no está `COMPLETADA` → debe rechazarse.
6. Importa un registro con `fechaFin` en el pasado → debe permitirse (a diferencia de la creación real de otrosí).
7. Confirma que un usuario sin el permiso `crear_enviar_solicitudes` (por ejemplo, un usuario con rol `GERENCIA`) recibe `403` al intentar `POST /api/solicitudes/importar-historico`.

- [ ] **Step 7: Commit**

```bash
git add src/features/solicitudes/components/estadoTimeline.tsx "src/app/(app)/solicitudes/[id]/page.tsx"
git commit -m "feat: show a historical-import notice instead of the approval stepper"
```
