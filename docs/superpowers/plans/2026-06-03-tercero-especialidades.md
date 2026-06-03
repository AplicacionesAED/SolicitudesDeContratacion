# Tercero–Especialidades: Asignación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir asignar especialidades a cada tercero y mostrarlas en el dropdown de selección de terceros en solicitudes.

**Architecture:** Relación many-to-many implícita de Prisma entre `Tercero` y `Especialidad`. Se actualizan los endpoints REST existentes para incluir y actualizar la relación. El frontend añade una tarjeta de edición en `/terceros/[id]`, una sección de checkboxes en `/terceros/nuevo`, y una segunda línea con especialidades en el dropdown de `solicitudForm.tsx`.

**Tech Stack:** Next.js 16 App Router · Prisma 7 + PrismaPg adapter · TypeScript · Tailwind CSS v4 · next-auth v4 · lucide-react

---

## File Map

| Archivo | Operación |
|---------|-----------|
| `prisma/schema.prisma` | Modificar — agregar relación many-to-many en `Tercero` y `Especialidad` |
| `src/app/api/terceros/route.ts` | Modificar — GET incluye especialidades; POST acepta `especialidadIds` |
| `src/app/api/terceros/[id]/route.ts` | Modificar — GET incluye especialidades; PATCH maneja `especialidadIds` |
| `src/app/(app)/terceros/[id]/page.tsx` | Modificar — agregar tarjeta Especialidades (vista + edición inline) |
| `src/app/(app)/terceros/nuevo/page.tsx` | Modificar — agregar sección Especialidades con checkboxes |
| `src/features/solicitudes/components/solicitudForm.tsx` | Modificar — mostrar especialidades bajo el nombre del tercero |

---

## Task 1: Relación many-to-many en schema.prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar la relación al modelo `Tercero`**

Localizar el modelo `Tercero` (alrededor de línea 120). La última línea antes del cierre es:
```prisma
  solicitudes Solicitud[]
}
```

Reemplazar el cierre con:
```prisma
  solicitudes    Solicitud[]
  especialidades Especialidad[] @relation("TerceroEspecialidades")
}
```

- [ ] **Step 2: Agregar la relación al modelo `Especialidad`**

Localizar el modelo `Especialidad` (alrededor de línea 152). Actualmente:
```prisma
model Especialidad {
  id            Int      @id @default(autoincrement())
  nombre        String   @unique
  descripcion   String?
  creadoEn      DateTime @default(now())
  actualizadoEn DateTime @updatedAt
}
```

Reemplazar con:
```prisma
model Especialidad {
  id            Int      @id @default(autoincrement())
  nombre        String   @unique
  descripcion   String?
  creadoEn      DateTime @default(now())
  actualizadoEn DateTime @updatedAt

  terceros Tercero[] @relation("TerceroEspecialidades")
}
```

- [ ] **Step 3: Regenerar cliente y sincronizar DB**

```bash
cd solicitudes-indirectos
npm run db:generate
npm run db:push
```

Salida esperada de `db:push`:
```
✔ Generated Prisma Client
The database is now in sync with your Prisma schema.
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd solicitudes-indirectos
npx tsc --noEmit
```

Salida esperada: sin errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add solicitudes-indirectos/prisma/schema.prisma
git commit -m "feat: add many-to-many relation between Tercero and Especialidad"
```

---

## Task 2: API `/api/terceros` — GET incluye especialidades, POST acepta especialidadIds

**Files:**
- Modify: `src/app/api/terceros/route.ts`

- [ ] **Step 1: Actualizar `GET` para incluir especialidades**

En `GET(request: Request)`, localizar:
```ts
    const terceros = await prisma.tercero.findMany({
      where,
      orderBy: { razonSocial: "asc" },
    });
```

Reemplazar con:
```ts
    const terceros = await prisma.tercero.findMany({
      where,
      orderBy: { razonSocial: "asc" },
      include: { especialidades: { select: { id: true, nombre: true } } },
    });
```

- [ ] **Step 2: Actualizar `POST` para aceptar `especialidadIds`**

En `POST(request: Request)`, localizar la desestructuración del body:
```ts
    const razonSocial: string = body.razonSocial?.trim();
    const nit: string = body.nit?.trim();
    const tipoContrato: string = body.tipoContrato;
    const confidencialidad: boolean = body.confidencialidad ?? false;
```

Reemplazar con:
```ts
    const razonSocial: string = body.razonSocial?.trim();
    const nit: string = body.nit?.trim();
    const tipoContrato: string = body.tipoContrato;
    const confidencialidad: boolean = body.confidencialidad ?? false;
    const especialidadIds: number[] = Array.isArray(body.especialidadIds) ? body.especialidadIds : [];
```

Luego localizar el bloque `prisma.tercero.create`:
```ts
    const tercero = await prisma.tercero.create({
      data: {
        razonSocial,
        nit,
        tipoContrato,
        confidencialidad,
      },
    });
```

Reemplazar con:
```ts
    const tercero = await prisma.tercero.create({
      data: {
        razonSocial,
        nit,
        tipoContrato,
        confidencialidad,
        ...(especialidadIds.length > 0
          ? { especialidades: { connect: especialidadIds.map((id) => ({ id })) } }
          : {}),
      },
      include: { especialidades: { select: { id: true, nombre: true } } },
    });
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd solicitudes-indirectos
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add solicitudes-indirectos/src/app/api/terceros/route.ts
git commit -m "feat: include especialidades in GET /api/terceros and accept especialidadIds in POST"
```

---

## Task 3: API `/api/terceros/[id]` — GET incluye especialidades, PATCH maneja especialidadIds

**Files:**
- Modify: `src/app/api/terceros/[id]/route.ts`

- [ ] **Step 1: Agregar `especialidadIds` al set de campos sin permiso especial**

Localizar:
```ts
const CONTACT_FIELDS = new Set([
  "nit",
  "representanteLegal",
  "cedulaRepresentante",
  "correoFirma",
  "direccionRepresentante",
  "telefonoRepresentante",
  "nombreContacto",
  "telefonoContacto",
  "correoContacto",
]);
```

Reemplazar con:
```ts
const CONTACT_FIELDS = new Set([
  "nit",
  "representanteLegal",
  "cedulaRepresentante",
  "correoFirma",
  "direccionRepresentante",
  "telefonoRepresentante",
  "nombreContacto",
  "telefonoContacto",
  "correoContacto",
  "especialidadIds",
]);
```

- [ ] **Step 2: Actualizar `GET` para incluir especialidades**

Localizar:
```ts
    const tercero = await prisma.tercero.findUnique({
      where: { id: numId },
      include: {
        _count: { select: { solicitudes: true } },
      },
    });
```

Reemplazar con:
```ts
    const tercero = await prisma.tercero.findUnique({
      where: { id: numId },
      include: {
        especialidades: { select: { id: true, nombre: true } },
        _count: { select: { solicitudes: true } },
      },
    });
```

- [ ] **Step 3: Actualizar `PATCH` para manejar `especialidadIds`**

Localizar el bloque que obtiene el body y construye el update:
```ts
    const body = await request.json();

    // Campos de contacto: cualquier usuario autenticado puede editarlos.
    // Cualquier otro campo (DD, SAGRILAFT, etc.) requiere permiso completo.
    const bodyKeys = Object.keys(body);
    const isContactOnlyUpdate = bodyKeys.length > 0 && bodyKeys.every((k) => CONTACT_FIELDS.has(k));

    if (!isContactOnlyUpdate && !tienePermiso(roles, funcionalidadesAdicionales, "editar_terceros")) {
      return Response.json({ error: "No tiene permiso para editar terceros" }, { status: 403 });
    }

    // Auto-set debida diligencia approval only when DD fields are being updated
    const hasDdFields = DD_FIELDS.some((f) => f in body);
    if (hasDdFields) {
      const merged: Record<string, boolean> = {};
      for (const field of DD_FIELDS) {
        merged[field] = field in body ? Boolean(body[field]) : existing[field];
      }
      const allDdTrue = DD_FIELDS.every((f) => merged[f]);
      body.aprobadoDebidaDiligencia = allDdTrue;
    }

    // Prevent direct NIT duplication
    if (body.nit && body.nit !== existing.nit) {
      const dup = await prisma.tercero.findFirst({
        where: { nit: body.nit },
      });
      if (dup) {
        return Response.json({ error: "Ya existe un tercero con ese NIT" }, { status: 409 });
      }
    }

    const updated = await prisma.tercero.update({
      where: { id: numId },
      data: body,
    });

    return Response.json(updated);
```

Reemplazar con:
```ts
    const body = await request.json();

    // Campos de contacto: cualquier usuario autenticado puede editarlos.
    // Cualquier otro campo (DD, SAGRILAFT, etc.) requiere permiso completo.
    const bodyKeys = Object.keys(body);
    const isContactOnlyUpdate = bodyKeys.length > 0 && bodyKeys.every((k) => CONTACT_FIELDS.has(k));

    if (!isContactOnlyUpdate && !tienePermiso(roles, funcionalidadesAdicionales, "editar_terceros")) {
      return Response.json({ error: "No tiene permiso para editar terceros" }, { status: 403 });
    }

    // Extraer especialidadIds antes de construir el data object (es una relación, no un campo escalar)
    const { especialidadIds, ...scalarBody } = body;

    // Auto-set debida diligencia approval only when DD fields are being updated
    const hasDdFields = DD_FIELDS.some((f) => f in scalarBody);
    if (hasDdFields) {
      const merged: Record<string, boolean> = {};
      for (const field of DD_FIELDS) {
        merged[field] = field in scalarBody ? Boolean(scalarBody[field]) : existing[field];
      }
      const allDdTrue = DD_FIELDS.every((f) => merged[f]);
      scalarBody.aprobadoDebidaDiligencia = allDdTrue;
    }

    // Prevent direct NIT duplication
    if (scalarBody.nit && scalarBody.nit !== existing.nit) {
      const dup = await prisma.tercero.findFirst({
        where: { nit: scalarBody.nit },
      });
      if (dup) {
        return Response.json({ error: "Ya existe un tercero con ese NIT" }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = { ...scalarBody };
    if (Array.isArray(especialidadIds)) {
      updateData.especialidades = { set: especialidadIds.map((id: number) => ({ id })) };
    }

    const updated = await prisma.tercero.update({
      where: { id: numId },
      data: updateData,
      include: { especialidades: { select: { id: true, nombre: true } } },
    });

    return Response.json(updated);
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd solicitudes-indirectos
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add "solicitudes-indirectos/src/app/api/terceros/[id]/route.ts"
git commit -m "feat: include especialidades in GET and handle especialidadIds in PATCH /api/terceros/[id]"
```

---

## Task 4: UI — Tarjeta Especialidades en `/terceros/[id]/page.tsx`

**Files:**
- Modify: `src/app/(app)/terceros/[id]/page.tsx`

- [ ] **Step 1: Actualizar imports y la interfaz `Tercero`**

Localizar los imports actuales de lucide-react y la interfaz `Tercero`. Añadir `Tag` a los iconos de lucide:

```tsx
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Tag,
} from "lucide-react";
```

Añadir `Button` a los imports de UI (`Spinner` ya está importado):
```tsx
import { Button } from "@/shared/ui/button";
```

Actualizar la interfaz `Tercero` para incluir `especialidades`:
```ts
interface Tercero {
  id: number;
  razonSocial: string;
  nit: string;
  representanteLegal: string;
  cedulaRepresentante: string;
  correoFirma: string;
  direccionRepresentante: string;
  telefonoRepresentante: string;
  nombreContacto?: string | null;
  telefonoContacto?: string | null;
  correoContacto?: string | null;
  tipoContrato: string;
  fechaVencimientoSagrilaft?: string | null;
  creadoEn: string;
  actualizadoEn: string;
  especialidades: { id: number; nombre: string }[];
}
```

Añadir la interfaz `Especialidad`:
```ts
interface Especialidad {
  id: number;
  nombre: string;
}
```

- [ ] **Step 2: Añadir estado para el módulo de especialidades**

Dentro del componente `TerceroDetallePage`, después de `const [loading, setLoading] = useState(true);`, añadir:

```tsx
const [editingEsp, setEditingEsp] = useState(false);
const [catalogo, setCatalogo] = useState<Especialidad[]>([]);
const [loadingCatalogo, setLoadingCatalogo] = useState(false);
const [selectedIds, setSelectedIds] = useState<number[]>([]);
const [savingEsp, setSavingEsp] = useState(false);
```

- [ ] **Step 3: Añadir función `openEditEsp`**

Después del cierre de `fetchData`, añadir:

```tsx
async function openEditEsp() {
  if (loadingCatalogo) return;
  setLoadingCatalogo(true);
  try {
    const res = await fetch("/api/especialidades", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setCatalogo(Array.isArray(data) ? data : []);
    }
  } finally {
    setLoadingCatalogo(false);
  }
  setSelectedIds(tercero?.especialidades.map((e) => e.id) ?? []);
  setEditingEsp(true);
}

function toggleId(id: number) {
  setSelectedIds((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  );
}

async function saveEsp() {
  if (!tercero) return;
  setSavingEsp(true);
  try {
    const res = await fetch(`/api/terceros/${tercero.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ especialidadIds: selectedIds }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Error al guardar");
      return;
    }
    const updated = await res.json();
    setTercero((prev) => prev ? { ...prev, especialidades: updated.especialidades } : prev);
    setEditingEsp(false);
  } finally {
    setSavingEsp(false);
  }
}
```

- [ ] **Step 4: Añadir la tarjeta Especialidades al JSX**

Localizar el cierre del componente JSX, justo antes del cierre del `</div>` principal (que cierra `<div className="max-w-4xl mx-auto space-y-5">`). Añadir la tarjeta después del bloque de Contacto Comercial:

```tsx
      {/* Especialidades */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Tag size={14} className="text-gray-400" />
            Especialidades
          </h2>
          {!editingEsp && (
            <button
              onClick={openEditEsp}
              disabled={loadingCatalogo}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            >
              {loadingCatalogo ? "Cargando..." : "Editar"}
            </button>
          )}
        </div>

        {editingEsp ? (
          <div className="space-y-3">
            {catalogo.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                No hay especialidades en el catálogo. Créalas primero desde{" "}
                <a href="/terceros/especialidades" className="text-blue-600 underline">
                  Terceros → Especialidades
                </a>.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {catalogo.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(e.id)}
                      onChange={() => toggleId(e.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{e.nombre}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button onClick={saveEsp} disabled={savingEsp}>
                {savingEsp ? "Guardando..." : "Guardar"}
              </Button>
              <Button variant="secondary" onClick={() => setEditingEsp(false)} disabled={savingEsp}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tercero.especialidades.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Sin especialidades asignadas</p>
            ) : (
              tercero.especialidades.map((e) => (
                <span key={e.id} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {e.nombre}
                </span>
              ))
            )}
          </div>
        )}
      </div>
```

- [ ] **Step 5: Actualizar la firma de `setTercero` — el hook debe usar la interfaz actualizada**

Verificar que `const [tercero, setTercero] = useState<Tercero | null>(null);` ya tiene el tipo correcto (tiene que haberlo después de actualizar la interfaz en Step 1). No se necesita otro cambio.

- [ ] **Step 6: Verificar TypeScript**

```bash
cd solicitudes-indirectos
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add "solicitudes-indirectos/src/app/(app)/terceros/[id]/page.tsx"
git commit -m "feat: add especialidades card to tercero detail page"
```

---

## Task 5: UI — Sección Especialidades en `/terceros/nuevo/page.tsx`

**Files:**
- Modify: `src/app/(app)/terceros/nuevo/page.tsx`

- [ ] **Step 1: Añadir `useEffect` al import de React**

Localizar:
```ts
import { useState } from "react";
```

Reemplazar con:
```ts
import { useState, useEffect } from "react";
```

- [ ] **Step 2: Añadir interfaz `Especialidad` y estado**

Después de la interfaz `FormErrors`, añadir:

```ts
interface Especialidad {
  id: number;
  nombre: string;
}
```

Dentro del componente `NuevoTerceroPage`, después de `const [errors, setErrors] = useState<FormErrors>({});`, añadir:

```tsx
const [especialidadIds, setEspecialidadIds] = useState<number[]>([]);
const [catalogo, setCatalogo] = useState<Especialidad[]>([]);

useEffect(() => {
  fetch("/api/especialidades", { cache: "no-store" })
    .then((res) => res.ok ? res.json() : [])
    .then((data) => setCatalogo(Array.isArray(data) ? data : []));
}, []);

function toggleEspecialidad(id: number) {
  setEspecialidadIds((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  );
}
```

- [ ] **Step 3: Incluir `especialidadIds` en el submit**

Localizar en `handleSubmit`:
```ts
      const res = await fetch("/api/terceros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nombreContacto: form.nombreContacto || undefined,
          telefonoContacto: form.telefonoContacto || undefined,
          correoContacto: form.correoContacto || undefined,
        }),
      });
```

Reemplazar con:
```ts
      const res = await fetch("/api/terceros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nombreContacto: form.nombreContacto || undefined,
          telefonoContacto: form.telefonoContacto || undefined,
          correoContacto: form.correoContacto || undefined,
          especialidadIds,
        }),
      });
```

- [ ] **Step 4: Añadir la sección de checkboxes al JSX**

Localizar el bloque de Submit al final del formulario:
```tsx
        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
```

Insertar antes del bloque de Submit:

```tsx
        {/* Especialidades */}
        {catalogo.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Especialidades</h2>
            <p className="text-xs text-gray-500">Selecciona las especialidades que aplican a este tercero (opcional).</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {catalogo.map((e) => (
                <label key={e.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={especialidadIds.includes(e.id)}
                    onChange={() => toggleEspecialidad(e.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{e.nombre}</span>
                </label>
              ))}
            </div>
          </div>
        )}
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd solicitudes-indirectos
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add "solicitudes-indirectos/src/app/(app)/terceros/nuevo/page.tsx"
git commit -m "feat: add especialidades checkboxes to nuevo tercero form"
```

---

## Task 6: UI — Especialidades en el dropdown de `solicitudForm.tsx`

**Files:**
- Modify: `src/features/solicitudes/components/solicitudForm.tsx`

- [ ] **Step 1: Actualizar la interfaz `Tercero`**

Localizar:
```ts
interface Tercero {
  id: number;
  razonSocial: string;
  nit: string;
  representanteLegal: string;
  cedulaRepresentante: string;
  correoFirma: string;
  direccionRepresentante: string;
  telefonoRepresentante: string;
  nombreContacto?: string | null;
  telefonoContacto?: string | null;
  correoContacto?: string | null;
  tipoContrato: string;
  aprobadoDebidaDiligencia: boolean;
  confidencialidad: boolean;
  fechaVencimientoSagrilaft?: string | null;
}
```

Reemplazar con:
```ts
interface Tercero {
  id: number;
  razonSocial: string;
  nit: string;
  representanteLegal: string;
  cedulaRepresentante: string;
  correoFirma: string;
  direccionRepresentante: string;
  telefonoRepresentante: string;
  nombreContacto?: string | null;
  telefonoContacto?: string | null;
  correoContacto?: string | null;
  tipoContrato: string;
  aprobadoDebidaDiligencia: boolean;
  confidencialidad: boolean;
  fechaVencimientoSagrilaft?: string | null;
  especialidades?: { id: number; nombre: string }[];
}
```

- [ ] **Step 2: Actualizar los items del dropdown (lista de opciones)**

Localizar (alrededor de línea 690-694):
```tsx
                          filtered.map((t) => (
                            <button key={t.id} type="button" onClick={() => { field.onChange(t.id); setTerceroSearch(""); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-blue-50 transition-colors">
                              <span className="flex-1 font-medium text-gray-900">{t.razonSocial}</span>
                              {sagrilaftBadge(t.fechaVencimientoSagrilaft)}
                            </button>
                          ))
```

Reemplazar con:
```tsx
                          filtered.map((t) => (
                            <button key={t.id} type="button" onClick={() => { field.onChange(t.id); setTerceroSearch(""); setOpen(false); }} className="flex w-full items-start gap-2 px-3 py-2.5 text-sm text-left hover:bg-blue-50 transition-colors">
                              <span className="flex-1 min-w-0">
                                <span className="block font-medium text-gray-900">{t.razonSocial}</span>
                                {t.especialidades && t.especialidades.length > 0 && (
                                  <span className="block text-xs text-gray-400 mt-0.5 pl-1">
                                    {t.especialidades.map((e) => `· ${e.nombre}`).join("  ")}
                                  </span>
                                )}
                              </span>
                              {sagrilaftBadge(t.fechaVencimientoSagrilaft)}
                            </button>
                          ))
```

- [ ] **Step 3: Actualizar el item seleccionado (campo cerrado)**

Localizar (alrededor de línea 670-676):
```tsx
                      {selected ? (
                        <>
                          <span className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="text-sm text-gray-900 font-medium truncate">{selected.razonSocial}</span>
                            {sagrilaftBadge(selected.fechaVencimientoSagrilaft)}
                          </span>
                          <button type="button" onClick={() => { field.onChange(undefined); setTerceroSearch(""); setOpen(true); }} className="shrink-0 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                        </>
```

Reemplazar con:
```tsx
                      {selected ? (
                        <>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="text-sm text-gray-900 font-medium truncate">{selected.razonSocial}</span>
                              {sagrilaftBadge(selected.fechaVencimientoSagrilaft)}
                            </span>
                            {selected.especialidades && selected.especialidades.length > 0 && (
                              <span className="block text-xs text-gray-400 pl-1 truncate">
                                {selected.especialidades.map((e) => `· ${e.nombre}`).join("  ")}
                              </span>
                            )}
                          </span>
                          <button type="button" onClick={() => { field.onChange(undefined); setTerceroSearch(""); setOpen(true); }} className="shrink-0 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                        </>
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd solicitudes-indirectos
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add solicitudes-indirectos/src/features/solicitudes/components/solicitudForm.tsx
git commit -m "feat: show especialidades below tercero name in solicitud dropdown"
```
