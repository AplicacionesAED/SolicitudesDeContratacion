# Otrosí Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el módulo de Otrosís — dos nuevos tipos de solicitud (`OTROSI_TIEMPO` y `OTROSI_TIEMPO_CANTIDAD`) que se crean como hijos de una solicitud completada, pasan por el mismo flujo de aprobación y actualizan la vista de cronogramas en el detalle y lista.

**Architecture:** Cada otrosí es una `Solicitud` con `solicitudPadreId` apuntando al contrato padre. El cronograma del otrosí es un `CronogramaContrato` normal; el padre conserva el suyo. El state machine existente se reutiliza sin cambios. Al completarse un `OTROSI_TIEMPO_CANTIDAD`, el `valorFinal` del padre se actualiza en la misma transacción.

**Tech Stack:** Next.js 16 App Router · Prisma 7 + `@prisma/adapter-pg` · TypeScript · Tailwind CSS v4 · next-auth v4 · react-hook-form / zod (solo en formulario padre; el otrosiForm usa estado nativo)

---

## Task 1: Schema — agregar `solicitudPadreId` a `Solicitud`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar relación auto-referencial al modelo `Solicitud`**

En `prisma/schema.prisma`, dentro del modelo `Solicitud`, justo antes de la línea `estado    String`:

```prisma
  solicitudPadreId Int?
  solicitudPadre   Solicitud?  @relation("OtrosiPadre", fields: [solicitudPadreId], references: [id])
  otrosis          Solicitud[] @relation("OtrosiPadre")
```

- [ ] **Step 2: Commit schema**

```bash
cd solicitudes-indirectos
git add prisma/schema.prisma
git commit -m "feat(schema): add solicitudPadreId self-referential relation for otrosis"
```

---

## Task 2: Migración y regeneración del cliente Prisma

**Files:**
- Create: `prisma/migrations/<timestamp>_add_solicitud_padre/migration.sql` (generado automáticamente)

- [ ] **Step 1: Crear y aplicar migración**

```bash
cd solicitudes-indirectos
npx prisma migrate dev --name add_solicitud_padre
```

Salida esperada: `The following migration(s) have been created and applied: migrations/..._add_solicitud_padre`

- [ ] **Step 2: Regenerar cliente Prisma**

```bash
npm run db:generate
```

Salida esperada: `Generated Prisma Client`

- [ ] **Step 3: Verificar que el build de TypeScript no tiene errores**

```bash
npx tsc --noEmit
```

Salida esperada: sin errores

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/
git commit -m "feat(db): migrate add_solicitud_padre"
```

---

## Task 3: Permisos — agregar `crear_otrosi` a `utils.ts`

**Files:**
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Agregar `crear_otrosi` al rol `SOLICITANTE` en `FUNCIONALIDADES_POR_ROL`**

Localizar el bloque `SOLICITANTE` en `FUNCIONALIDADES_POR_ROL` (línea ~259) y agregar el slug:

```typescript
SOLICITANTE: [
  "crear_enviar_solicitudes",
  "reenviar_solicitudes",
  "ver_solicitudes_propias",
  "crear_otrosi",
],
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat(permisos): add crear_otrosi permission to SOLICITANTE role"
```

---

## Task 4: Configuración Usuarios — exponer `crear_otrosi` en la UI

**Files:**
- Modify: `src/app/(app)/configuracion/usuarios/page.tsx`

- [ ] **Step 1: Agregar entrada a `TODAS_LAS_FUNCIONALIDADES`**

Después de la entrada `ver_solicitudes_propias` (~línea 59), agregar:

```typescript
crear_otrosi: { nombre: "Crear otrosís de contratos completados", rolPorDefecto: "SOLICITANTE" },
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/configuracion/usuarios/page.tsx
git commit -m "feat(ui): expose crear_otrosi permission in user config"
```

---

## Task 5: API — `GET /api/solicitudes` y `POST /api/solicitudes`

**Files:**
- Modify: `src/app/api/solicitudes/route.ts`

### GET — agregar `_count.otrosis` y filtro `solicitudPadreId`

- [ ] **Step 1: Agregar `solicitudPadreId` a los filtros del GET**

Después de la línea `if (proyectoId) where.proyectoId = ...`, agregar:

```typescript
const solicitudPadreId = searchParams.get("solicitudPadreId");
if (solicitudPadreId) where.solicitudPadreId = parseInt(solicitudPadreId, 10);
```

- [ ] **Step 2: Incluir `_count` en el `findMany`**

En la llamada a `prisma.solicitud.findMany`, agregar `_count` al `include`:

```typescript
let solicitudes = await prisma.solicitud.findMany({
  where,
  include: {
    solicitante: { select: { id: true, nombre: true, cargo: true, email: true } },
    tercero: { select: { id: true, razonSocial: true, nit: true } },
    aprobador: { select: { id: true, nombre: true, cargo: true } },
    _count: { select: { otrosis: true } },
  },
  orderBy: { creadoEn: "desc" },
});
```

### POST — manejar `solicitudPadreId` (flujo otrosí)

- [ ] **Step 3: Extraer `solicitudPadreId` y `valorEnLetras` del body**

En el bloque de desestructuración del body del POST, agregar:

```typescript
const {
  tipo,
  proyectoId,
  frentesIds,
  terceroId,
  descripcionActividad,
  plazoEjecucion,
  formaPago,
  valorFinal,
  tipoContrato,
  asunto,
  creacionTercero,
  alcance,
  terminosReferencia,
  condicionesEspeciales,
  valorEnLetras,
  contratanteNombre,
  contratanteNit,
  archivoCuadroComparativo,
  archivoCotizacion,
  archivoBEP,
  solicitudPadreId,  // ← nuevo
} = body;
```

- [ ] **Step 4: Agregar bloque de flujo otrosí antes del flujo normal**

Justo antes de la validación `if (!tipo || !proyectoId || ...)`, insertar:

```typescript
// ── Flujo otrosí ──────────────────────────────────────────────────────────────
if (solicitudPadreId) {
  if (!tienePermiso(userRoles, funcionalidadesAdicionales, "crear_otrosi")) {
    return Response.json(
      { error: "No tienes permiso para crear otrosís. Contacta al administrador." },
      { status: 403 }
    );
  }

  const parent = await prisma.solicitud.findUnique({
    where: { id: Number(solicitudPadreId) },
  });

  if (!parent) {
    return Response.json({ error: "Solicitud padre no encontrada" }, { status: 404 });
  }
  if (parent.estado !== "COMPLETADA") {
    return Response.json(
      { error: "Solo se pueden crear otrosís de solicitudes en estado COMPLETADA" },
      { status: 400 }
    );
  }
  if (!tipo || !["OTROSI_TIEMPO", "OTROSI_TIEMPO_CANTIDAD"].includes(tipo)) {
    return Response.json(
      { error: "Tipo inválido para otrosí" },
      { status: 400 }
    );
  }

  const parentFrentesIds: number[] = (() => { try { return JSON.parse(parent.frentesIds || "[]"); } catch { return []; } })();
  const firstFrenteId = parentFrentesIds[0];

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

  // Para OTROSI_TIEMPO_CANTIDAD: usar el valor del body; para TIEMPO: heredar del padre
  const finalValorFinal =
    tipo === "OTROSI_TIEMPO_CANTIDAD" && valorFinal != null
      ? valorFinal
      : parent.valorFinal;
  const finalValorEnLetras =
    tipo === "OTROSI_TIEMPO_CANTIDAD" && valorFinal != null
      ? (valorEnLetras ?? null)
      : parent.valorEnLetras;

  const solicitud = await prisma.$transaction(async (tx) => {
    const key = `${tipo}-${proyAbbr}-${frenAbbr}`;
    const counter = await tx.contadorConsecutivo.upsert({
      where: { tipo: key },
      update: { ultimo: { increment: 1 } },
      create: { tipo: key, anio: new Date().getFullYear(), ultimo: 1 },
    });

    const consecutivo = buildConsecutivo(tipo as string, proyAbbr, frenAbbr, counter.ultimo);

    return tx.solicitud.create({
      data: {
        consecutivo,
        tipo,
        solicitudPadreId: parent.id,
        proyectoId: parent.proyectoId,
        frentesIds: parent.frentesIds,
        solicitanteId: session.user.id,
        aprobadorId: parent.aprobadorId ?? null,
        responsableContratosTramiteId: parent.responsableContratosTramiteId ?? null,
        responsableContratosMinutaId: parent.responsableContratosMinutaId ?? null,
        coordinadorControlesId: parent.coordinadorControlesId ?? null,
        directorControlesId: parent.directorControlesId ?? null,
        estado: "BORRADOR",
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
      },
      include: {
        solicitante: { select: { id: true, nombre: true, cargo: true } },
        tercero: { select: { id: true, razonSocial: true, nit: true } },
      },
    });
  });

  return Response.json(solicitud, { status: 201 });
}
// ── Fin flujo otrosí ──────────────────────────────────────────────────────────
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/solicitudes/route.ts
git commit -m "feat(api): add otrosi flow to GET+POST /api/solicitudes"
```

---

## Task 6: API — `GET /api/solicitudes/[id]` incluye `otrosis` y `solicitudPadre`

**Files:**
- Modify: `src/app/api/solicitudes/[id]/route.ts`

- [ ] **Step 1: Agregar `solicitudPadre` y `otrosis` al `include` del GET**

En la llamada a `prisma.solicitud.findUnique` del GET, ampliar el `include`:

```typescript
const solicitud = await prisma.solicitud.findUnique({
  where: { id: numId },
  include: {
    solicitante: {
      select: { id: true, nombre: true, cargo: true, email: true, telefono: true },
    },
    tercero: true,
    aprobador: {
      select: { id: true, nombre: true, cargo: true, email: true },
    },
    cronograma: {
      include: {
        fases: {
          include: { actividades: { orderBy: { id: "asc" } } },
          orderBy: { numeroFase: "asc" },
        },
        actividades: {
          where: { faseId: null },
          orderBy: { fechaInicio: "asc" },
        },
      },
    },
    historial: {
      include: {
        usuario: { select: { id: true, nombre: true, rol: true } },
      },
      orderBy: { fecha: "desc" },
    },
    solicitudPadre: {
      select: { id: true, consecutivo: true, tipo: true },
    },
    otrosis: {
      select: {
        id: true,
        consecutivo: true,
        tipo: true,
        estado: true,
        creadoEn: true,
        valorFinal: true,
        cronograma: {
          include: {
            fases: {
              orderBy: { numeroFase: "asc" },
              include: { actividades: { orderBy: { fechaInicio: "asc" } } },
            },
            actividades: {
              where: { faseId: null },
              orderBy: { fechaInicio: "asc" },
            },
          },
        },
      },
      orderBy: { creadoEn: "asc" },
    },
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/solicitudes/\[id\]/route.ts
git commit -m "feat(api): include otrosis and solicitudPadre in GET /api/solicitudes/[id]"
```

---

## Task 7: API — actualizar `valorFinal` del padre al completar `OTROSI_TIEMPO_CANTIDAD`

**Files:**
- Modify: `src/app/api/solicitudes/[id]/estado/route.ts`

- [ ] **Step 1: Leer `solicitudPadreId` junto con los datos de la solicitud**

En la llamada `prisma.solicitud.findUnique` del estado route (línea ~142), agregar `solicitudPadreId` al select:

```typescript
const solicitud = await prisma.solicitud.findUnique({
  where: { id: numId },
  include: {
    solicitante: { select: { id: true, nombre: true } },
    aprobador: { select: { id: true, nombre: true } },
  },
});
```

Prisma incluye automáticamente todos los campos escalares (incluyendo `solicitudPadreId` y `tipo`) en `findUnique` sin `select` restringido, así que no se necesita cambio aquí.

- [ ] **Step 2: Actualizar `valorFinal` del padre dentro de la transacción**

Dentro del bloque `prisma.$transaction`, después de crear el historial y antes del `return sol`, agregar:

```typescript
// Si se completa un OTROSI_TIEMPO_CANTIDAD, actualizar el valorFinal del padre
if (
  estadoDestino === "COMPLETADA" &&
  solicitud.tipo === "OTROSI_TIEMPO_CANTIDAD" &&
  solicitud.solicitudPadreId != null &&
  sol.valorFinal != null
) {
  await tx.solicitud.update({
    where: { id: solicitud.solicitudPadreId },
    data: { valorFinal: sol.valorFinal },
  });
}
```

El bloque de transacción completo queda:

```typescript
const updated = await prisma.$transaction(async (tx) => {
  const sol = await tx.solicitud.update({
    where: { id: numId },
    data: updateData,
  });

  await tx.historialSolicitud.create({
    data: {
      solicitudId: numId,
      usuarioId: userId,
      accion,
      nota: nota ?? null,
    },
  });

  if (
    estadoDestino === "COMPLETADA" &&
    solicitud.tipo === "OTROSI_TIEMPO_CANTIDAD" &&
    solicitud.solicitudPadreId != null &&
    sol.valorFinal != null
  ) {
    await tx.solicitud.update({
      where: { id: solicitud.solicitudPadreId },
      data: { valorFinal: sol.valorFinal },
    });
  }

  return sol;
});
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/solicitudes/\[id\]/estado/route.ts
git commit -m "feat(api): update parent valorFinal when OTROSI_TIEMPO_CANTIDAD is completed"
```

---

## Task 8: Componente `otrosiForm.tsx`

**Files:**
- Create: `src/features/solicitudes/components/otrosiForm.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { useToast } from "@/shared/ui/toaster";
import {
  CronogramaBuilder,
  type CronogramaData,
} from "@/features/solicitudes/components/cronogramaBuilder";
import {
  formatCurrency,
  formatDate,
  TIPO_SOLICITUD_LABELS,
  numeroALetras,
} from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SolicitudRow {
  id: number;
  consecutivo: string;
  tipo: string;
  valorFinal?: number | string | null;
  tercero?: { razonSocial: string; nit: string } | null;
}

interface SolicitudDetalle extends SolicitudRow {
  cronograma?: {
    tieneFases: boolean;
    fechaInicio: string;
    fechaFin: string;
    fases: {
      id: number;
      numeroFase: number;
      nombreFase: string;
      fechaInicio: string;
      fechaFin: string;
      actividades: { id: number; descripcion: string; fechaInicio: string; fechaFin: string }[];
    }[];
    actividades: { id: number; descripcion: string; fechaInicio: string; fechaFin: string }[];
  } | null;
}

export interface OtrosiFormProps {
  tipo: "OTROSI_TIEMPO" | "OTROSI_TIEMPO_CANTIDAD";
}

const defaultCronograma: CronogramaData = {
  tieneFases: false,
  fechaInicio: "",
  fechaFin: "",
  fases: [],
  actividades: [{ descripcion: "", fechaInicio: "", fechaFin: "" }],
};

// ─── Component ────────────────────────────────────────────────────────────────

export function OtrosiForm({ tipo }: OtrosiFormProps) {
  const router = useRouter();
  const { addToast } = useToast();

  // Step 1 — parent selection
  const [solicitudes, setSolicitudes] = useState<SolicitudRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedParent, setSelectedParent] = useState<SolicitudDetalle | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Step 2 — new cronograma
  const [cronograma, setCronograma] = useState<CronogramaData>(defaultCronograma);
  const [cronogramaError, setCronogramaError] = useState("");

  // Step 2b — new value (TIEMPO_CANTIDAD only)
  const [nuevoValor, setNuevoValor] = useState("");
  const [valorError, setValorError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/solicitudes?estado=COMPLETADA")
      .then((r) => r.json())
      .then((data) => setSolicitudes(Array.isArray(data) ? data : []))
      .catch(() => setSolicitudes([]))
      .finally(() => setLoadingList(false));
  }, []);

  const filtered = solicitudes.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.consecutivo.toLowerCase().includes(q) ||
      (s.tercero?.razonSocial ?? "").toLowerCase().includes(q) ||
      (s.tercero?.nit ?? "").toLowerCase().includes(q)
    );
  });

  async function handleSelectParent(row: SolicitudRow) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/solicitudes/${row.id}`);
      if (!res.ok) throw new Error("Error al cargar detalle");
      const data = await res.json();
      setSelectedParent(data);
      setCronograma(defaultCronograma);
      setNuevoValor("");
      setCronogramaError("");
      setValorError("");
    } catch {
      addToast("Error al cargar el detalle del contrato", "error");
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleBack() {
    setSelectedParent(null);
    setCronograma(defaultCronograma);
  }

  async function handleSubmit() {
    let hasError = false;

    if (!cronograma.fechaInicio || !cronograma.fechaFin) {
      setCronogramaError("Debes completar el cronograma con fechas de inicio y fin.");
      hasError = true;
    } else {
      setCronogramaError("");
    }

    if (tipo === "OTROSI_TIEMPO_CANTIDAD") {
      const v = parseFloat(nuevoValor);
      if (!nuevoValor || isNaN(v) || v <= 0) {
        setValorError("Ingresa un valor de contrato válido y mayor a 0.");
        hasError = true;
      } else {
        setValorError("");
      }
    }

    if (hasError || !selectedParent) return;

    setSubmitting(true);
    try {
      const bodyValor =
        tipo === "OTROSI_TIEMPO_CANTIDAD"
          ? {
              valorFinal: parseFloat(nuevoValor),
              valorEnLetras: numeroALetras(parseFloat(nuevoValor)),
            }
          : {};

      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          solicitudPadreId: selectedParent.id,
          ...bodyValor,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast(data.error ?? "Error al crear el otrosí", "error");
        return;
      }

      const cronRes = await fetch(`/api/solicitudes/${data.id}/cronograma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cronograma),
      });

      if (!cronRes.ok) {
        const cronData = await cronRes.json();
        addToast(cronData.error ?? "Otrosí creado pero error al guardar el cronograma", "error");
        router.push(`/solicitudes/${data.id}`);
        return;
      }

      addToast("Otrosí creado exitosamente", "success");
      router.push(`/solicitudes/${data.id}`);
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step 1: parent selection ────────────────────────────────────────────────

  if (!selectedParent) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <Link
            href="/solicitudes/nueva"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
          >
            <ArrowLeft size={14} />
            Volver al selector de tipo
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {TIPO_SOLICITUD_LABELS[tipo]}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Selecciona el contrato base al que se aplica este otrosí.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por consecutivo, tercero o NIT..."
                className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loadingList ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
              <span className="ml-2 text-sm text-gray-500">Cargando detalle...</span>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-10">
              No hay contratos completados{search ? " que coincidan con la búsqueda" : ""}.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {filtered.map((s) => (
                <li
                  key={s.id}
                  onClick={() => handleSelectParent(s)}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-semibold text-blue-600">
                      {s.consecutivo}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {s.tercero?.razonSocial ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {s.valorFinal != null && (
                      <span className="text-sm font-medium text-gray-700">
                        {formatCurrency(s.valorFinal)}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-gray-400" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ── Step 2: cronograma + optional value ────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ChevronLeft size={14} />
          Cambiar contrato base
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {TIPO_SOLICITUD_LABELS[tipo]}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Contrato base:{" "}
          <span className="font-mono font-semibold text-blue-600">
            {selectedParent.consecutivo}
          </span>
          {selectedParent.tercero && ` — ${selectedParent.tercero.razonSocial}`}
        </p>
      </div>

      {/* Cronograma vigente del padre (referencia) */}
      {selectedParent.cronograma && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Cronograma vigente del contrato base
          </h3>
          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <span>
              <span className="font-medium">Inicio:</span>{" "}
              {formatDate(selectedParent.cronograma.fechaInicio)}
            </span>
            <span>
              <span className="font-medium">Fin:</span>{" "}
              {formatDate(selectedParent.cronograma.fechaFin)}
            </span>
          </div>
          {selectedParent.cronograma.actividades.length > 0 && (
            <ul className="mt-2 space-y-1">
              {selectedParent.cronograma.actividades.slice(0, 5).map((a) => (
                <li key={a.id} className="text-xs text-gray-600 flex gap-2">
                  <span className="text-gray-400">•</span>
                  <span className="truncate">{a.descripcion}</span>
                </li>
              ))}
              {selectedParent.cronograma.actividades.length > 5 && (
                <li className="text-xs text-gray-400">
                  + {selectedParent.cronograma.actividades.length - 5} más...
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Nuevo valor (solo OTROSI_TIEMPO_CANTIDAD) */}
      {tipo === "OTROSI_TIEMPO_CANTIDAD" && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Nuevo valor del contrato</h2>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Valor (COP) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={nuevoValor}
              onChange={(e) => { setNuevoValor(e.target.value); setValorError(""); }}
              min={0}
              step={0.01}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            {valorError && (
              <p className="text-xs text-red-600 mt-1">{valorError}</p>
            )}
            {nuevoValor && !isNaN(parseFloat(nuevoValor)) && parseFloat(nuevoValor) > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {numeroALetras(parseFloat(nuevoValor))}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Nuevo cronograma */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Nuevo Cronograma</h2>
        <CronogramaBuilder
          value={cronograma}
          onChange={(data) => { setCronograma(data); setCronogramaError(""); }}
        />
        {cronogramaError && (
          <p className="text-xs text-red-600 mt-2">{cronogramaError}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Link href="/solicitudes">
          <Button variant="secondary" disabled={submitting}>
            Cancelar
          </Button>
        </Link>
        <Button loading={submitting} onClick={handleSubmit}>
          Guardar Otrosí
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/solicitudes/components/otrosiForm.tsx
git commit -m "feat(ui): add OtrosiForm component"
```

---

## Task 9: Páginas de rutas + activar en selector

**Files:**
- Create: `src/app/(app)/solicitudes/nueva/otrosi-tiempo/page.tsx`
- Create: `src/app/(app)/solicitudes/nueva/otrosi-tiempo-cantidad/page.tsx`
- Modify: `src/app/(app)/solicitudes/nueva/page.tsx`

- [ ] **Step 1: Crear `otrosi-tiempo/page.tsx`**

```tsx
// src/app/(app)/solicitudes/nueva/otrosi-tiempo/page.tsx
import { OtrosiForm } from "@/features/solicitudes/components/otrosiForm";

export default function NuevaOtrosiTiempoPage() {
  return <OtrosiForm tipo="OTROSI_TIEMPO" />;
}
```

- [ ] **Step 2: Crear `otrosi-tiempo-cantidad/page.tsx`**

```tsx
// src/app/(app)/solicitudes/nueva/otrosi-tiempo-cantidad/page.tsx
import { OtrosiForm } from "@/features/solicitudes/components/otrosiForm";

export default function NuevaOtrosiTiempoCantidadPage() {
  return <OtrosiForm tipo="OTROSI_TIEMPO_CANTIDAD" />;
}
```

- [ ] **Step 3: Activar rutas en `nueva/page.tsx`**

Cambiar `active: false` a `active: true` para los dos otrosís:

```typescript
{
  tipo: "OTROSI_TIEMPO",
  url: "otrosi-tiempo",
  label: TIPO_SOLICITUD_LABELS.OTROSI_TIEMPO,
  description: "Modificación del plazo de un contrato existente.",
  icon: Clock,
  active: true,   // ← cambiar de false a true
},
{
  tipo: "OTROSI_TIEMPO_CANTIDAD",
  url: "otrosi-tiempo-cantidad",
  label: TIPO_SOLICITUD_LABELS.OTROSI_TIEMPO_CANTIDAD,
  description: "Modificación de tiempo, cantidad y/o valor del contrato.",
  icon: PlusCircle,
  active: true,   // ← cambiar de false a true
},
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/solicitudes/nueva/
git commit -m "feat(routes): add otrosi-tiempo and otrosi-tiempo-cantidad pages"
```

---

## Task 10: Lista de solicitudes — filas expandibles para otrosís

**Files:**
- Modify: `src/app/(app)/solicitudes/page.tsx`

- [ ] **Step 1: Actualizar el tipo `SolicitudRow` y agregar estado de expansión**

En la sección de Types, actualizar `SolicitudRow`:

```typescript
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
}
```

Agregar estado en el componente (junto a los otros `useState`):

```typescript
const [expandedId, setExpandedId] = useState<number | null>(null);
const [childrenMap, setChildrenMap] = useState<Record<number, SolicitudRow[]>>({});
const [loadingChildren, setLoadingChildren] = useState<Record<number, boolean>>({});
```

- [ ] **Step 2: Agregar función `toggleExpand`**

Antes del `return`, agregar:

```typescript
async function toggleExpand(id: number) {
  if (expandedId === id) {
    setExpandedId(null);
    return;
  }
  setExpandedId(id);
  if (!childrenMap[id]) {
    setLoadingChildren((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/solicitudes?solicitudPadreId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setChildrenMap((prev) => ({ ...prev, [id]: Array.isArray(data) ? data : [] }));
      }
    } finally {
      setLoadingChildren((prev) => ({ ...prev, [id]: false }));
    }
  }
}
```

- [ ] **Step 3: Agregar import `React` y actualizar el tbody**

Agregar al bloque de imports:

```typescript
import React from "react";
```

En el `<tbody>`, cambiar el `paginated.map` para usar `React.Fragment` con filas expandibles:

```tsx
<tbody className="divide-y divide-gray-100">
  {paginated.map((sol) => {
    const otrosiCount = sol._count?.otrosis ?? 0;
    const isExpanded = expandedId === sol.id;
    const children = childrenMap[sol.id] ?? [];

    return (
      <React.Fragment key={sol.id}>
        <tr
          className="hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => router.push(`/solicitudes/${sol.id}`)}
        >
          <td className="px-4 py-3 whitespace-nowrap">
            <span className="text-sm font-mono font-semibold text-blue-600">
              {sol.consecutivo}
            </span>
          </td>
          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[180px]">
            <div className="flex flex-col gap-0.5">
              <span className="block truncate">
                {TIPO_SOLICITUD_LABELS[sol.tipo] ?? sol.tipo}
              </span>
              {otrosiCount > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleExpand(sol.id); }}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium w-fit"
                >
                  {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  {otrosiCount} otrosí{otrosiCount !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          </td>
          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[180px]">
            <span className="block truncate">{sol.tercero?.razonSocial ?? "—"}</span>
          </td>
          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
            {sol.solicitante.nombre}
          </td>
          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
            {sol.valorFinal ? formatCurrency(sol.valorFinal) : "—"}
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            <SolicitudBadge estado={sol.estado} />
          </td>
          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
            {formatDate(sol.fechaSolicitud)}
          </td>
          <td className="px-4 py-3 whitespace-nowrap text-right">
            <Link
              href={`/solicitudes/${sol.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver
            </Link>
          </td>
        </tr>

        {/* Fila expandible de otrosís */}
        {isExpanded && (
          <tr className="bg-blue-50/40">
            <td colSpan={8} className="px-6 py-3">
              {loadingChildren[sol.id] ? (
                <div className="flex items-center gap-2 py-2">
                  <Spinner size="sm" />
                  <span className="text-xs text-gray-500">Cargando otrosís...</span>
                </div>
              ) : children.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-1">Sin otrosís registrados.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th className="pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide pr-6">Consecutivo</th>
                      <th className="pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide pr-6">Tipo</th>
                      <th className="pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide pr-6">Estado</th>
                      <th className="pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {children.map((child) => (
                      <tr
                        key={child.id}
                        onClick={(e) => { e.stopPropagation(); router.push(`/solicitudes/${child.id}`); }}
                        className="cursor-pointer hover:bg-blue-100/50 transition-colors"
                      >
                        <td className="py-2 pr-6">
                          <span className="text-xs font-mono font-semibold text-blue-600">
                            {child.consecutivo}
                          </span>
                        </td>
                        <td className="py-2 pr-6 text-xs text-gray-700">
                          {TIPO_SOLICITUD_LABELS[child.tipo] ?? child.tipo}
                        </td>
                        <td className="py-2 pr-6">
                          <SolicitudBadge estado={child.estado} />
                        </td>
                        <td className="py-2 text-xs text-gray-500">
                          {formatDate(child.fechaSolicitud)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  })}
</tbody>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/solicitudes/page.tsx
git commit -m "feat(ui): add expandable otrosi rows to solicitudes list"
```

---

## Task 11: Detalle de solicitud — banner y sección de cronogramas

**Files:**
- Modify: `src/app/(app)/solicitudes/[id]/page.tsx`

- [ ] **Step 1: Actualizar la query de Prisma para incluir `otrosis` y `solicitudPadre`**

En la llamada a `prisma.solicitud.findUnique` (~línea 76), agregar al `include`:

```typescript
solicitudPadre: {
  select: { id: true, consecutivo: true, tipo: true },
},
otrosis: {
  select: {
    id: true,
    consecutivo: true,
    tipo: true,
    estado: true,
    creadoEn: true,
    valorFinal: true,
    cronograma: {
      include: {
        fases: {
          orderBy: { numeroFase: "asc" },
          include: { actividades: { orderBy: { fechaInicio: "asc" } } },
        },
        actividades: {
          where: { faseId: null },
          orderBy: { fechaInicio: "asc" },
        },
      },
    },
  },
  orderBy: { creadoEn: "asc" },
},
```

- [ ] **Step 2: Agregar `Link` en imports y el icon `GitMerge`**

En los imports de lucide-react, agregar `GitMerge`:

```typescript
import {
  ArrowLeft, User, Calendar, Building2, FileText, Clock,
  DollarSign, Hash, Paperclip, Layers, GitMerge,
} from "lucide-react";
```

- [ ] **Step 3: Agregar banner de otrosí (si la solicitud actual es un otrosí)**

Justo después del bloque `<div className="flex flex-wrap items-start justify-between gap-3">` del header (alrededor de la línea 148), antes del `<EstadoTimeline>`, agregar:

```tsx
{/* Banner: este es un otrosí */}
{solicitud.solicitudPadre && (
  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
    <GitMerge size={16} className="text-blue-500 shrink-0" />
    <p className="text-sm text-blue-800">
      Este otrosí corresponde al contrato{" "}
      <Link
        href={`/solicitudes/${solicitud.solicitudPadre.id}`}
        className="font-mono font-semibold hover:underline"
      >
        {solicitud.solicitudPadre.consecutivo}
      </Link>
    </p>
  </div>
)}
```

- [ ] **Step 4: Agregar sección de cronogramas de otrosís**

Localizar el bloque `{/* Sección 6 — Cronograma */}` (~línea 354). Después del cierre de ese bloque (`</div>` final, ~línea 433), agregar:

```tsx
{/* Cronogramas de otrosís */}
{solicitud.otrosis && solicitud.otrosis.length > 0 && (() => {
  // Encontrar el otrosí completado más reciente para la etiqueta "Vigente"
  const completados = solicitud.otrosis.filter((o: any) => o.estado === "COMPLETADA");
  const vigenteId = completados.length > 0
    ? completados[completados.length - 1].id
    : null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-900 px-1">
        Cronogramas — Otrosís
      </h2>
      {solicitud.otrosis.map((otrosi: any, idx: number) => {
        const isVigente = otrosi.id === vigenteId;
        const enTramite = otrosi.estado !== "COMPLETADA";
        return (
          <div
            key={otrosi.id}
            className={`border rounded-xl overflow-hidden ${
              isVigente
                ? "border-blue-400 bg-white"
                : "border-gray-200 bg-white"
            }`}
          >
            <div
              className={`px-5 py-3 border-b flex items-center justify-between ${
                isVigente
                  ? "bg-blue-50 border-blue-200"
                  : "bg-gray-50 border-gray-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">
                  Otrosí {idx + 1} —{" "}
                  <Link
                    href={`/solicitudes/${otrosi.id}`}
                    className="font-mono hover:underline text-blue-600"
                  >
                    {otrosi.consecutivo}
                  </Link>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {enTramite && (
                  <span className="text-xs font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">
                    En trámite
                  </span>
                )}
                {isVigente && (
                  <span className="text-xs font-medium bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    Vigente
                  </span>
                )}
                <Calendar size={14} className="text-gray-400" />
              </div>
            </div>
            <div className="p-5 space-y-4">
              {otrosi.cronograma ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha de inicio</p>
                      <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                        <Calendar size={13} className="text-gray-400" />
                        {formatDate(otrosi.cronograma.fechaInicio)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha de fin</p>
                      <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                        <Calendar size={13} className="text-gray-400" />
                        {formatDate(otrosi.cronograma.fechaFin)}
                      </div>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Descripción</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-32">Inicio</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-32">Fin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {otrosi.cronograma.tieneFases
                          ? otrosi.cronograma.fases.map((fase: any) => (
                              <React.Fragment key={fase.id}>
                                <tr className="bg-blue-50/30">
                                  <td colSpan={3} className="px-4 py-1.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                                    Fase {fase.numeroFase}: {fase.nombreFase}
                                  </td>
                                </tr>
                                {fase.actividades.map((act: any) => (
                                  <tr key={act.id}>
                                    <td className="px-4 py-2.5 text-sm text-gray-700">{act.descripcion}</td>
                                    <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">{formatDate(act.fechaInicio)}</td>
                                    <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">{formatDate(act.fechaFin)}</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))
                          : otrosi.cronograma.actividades.map((act: any) => (
                              <tr key={act.id}>
                                <td className="px-4 py-2.5 text-sm text-gray-700">{act.descripcion}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">{formatDate(act.fechaInicio)}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">{formatDate(act.fechaFin)}</td>
                              </tr>
                            ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">Sin cronograma registrado.</p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
})()}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/solicitudes/\[id\]/page.tsx
git commit -m "feat(ui): add otrosi banner and cronogramas section to solicitud detail"
```

---

## Task 12: Build final y verificación

**Files:** ninguno nuevo

- [ ] **Step 1: Ejecutar build completo**

```bash
cd solicitudes-indirectos
npm run build
```

Salida esperada: `✓ Compiled successfully` sin errores TypeScript.

- [ ] **Step 2: Iniciar servidor de desarrollo y verificar manualmente**

```bash
npm run dev
```

Verificar en `http://localhost:3000`:
1. Ir a `/solicitudes/nueva` → los botones de "Otrosí por Tiempo" y "Otrosí Tiempo, Cantidad..." están activos (sin overlay "Próximamente")
2. Hacer clic en "Otrosí por Tiempo" → muestra la lista de contratos completados con buscador
3. Seleccionar un contrato → avanza al paso 2 con el cronograma de referencia y el builder
4. Llenar el cronograma y guardar → redirige al detalle del otrosí (BORRADOR)
5. El detalle muestra el banner "Este otrosí corresponde al contrato [consecutivo]"
6. En el detalle del contrato padre → aparece la sección "Cronogramas — Otrosís"
7. En la lista `/solicitudes` → la fila del padre muestra "N otrosí(s)" en la columna Tipo; al hacer clic se despliegan los hijos
8. En Configuración → Usuarios, editar un usuario → aparece el checkbox "Crear otrosís de contratos completados"

- [ ] **Step 3: Commit final del plan**

```bash
cd solicitudes-indirectos
git add docs/superpowers/plans/2026-05-11-otrosi-implementation.md
git commit -m "docs: add otrosi implementation plan"
```
