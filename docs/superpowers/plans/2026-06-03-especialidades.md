# Especialidades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un CRUD completo de especialidades accesible desde el módulo de Terceros, con permiso configurable por usuario.

**Architecture:** Nuevo modelo `Especialidad` en Prisma (solo `nombre` + `descripcion`). API REST en `/api/especialidades` con GET/POST y `/api/especialidades/[id]` con PATCH/DELETE. Página de lista con modales inline en `/terceros/especialidades`, siguiendo el patrón del módulo de configuración existente. El permiso `gestionar_especialidades` se agrega al sistema existente de funcionalidades.

**Tech Stack:** Next.js 16 App Router · Prisma 7 + PrismaPg adapter · TypeScript · Tailwind CSS v4 · next-auth v4 · lucide-react

---

## File Map

| Archivo | Operación |
|---------|-----------|
| `prisma/schema.prisma` | Modificar — agregar modelo `Especialidad` |
| `src/lib/utils.ts` | Modificar — agregar slug a `FUNCIONALIDADES_POR_ROL.ADMIN` |
| `src/app/(app)/configuracion/usuarios/page.tsx` | Modificar — agregar entrada en `FUNCIONALIDADES_BASE` |
| `src/app/api/especialidades/route.ts` | Crear — GET + POST |
| `src/app/api/especialidades/[id]/route.ts` | Crear — PATCH + DELETE |
| `src/app/(app)/terceros/especialidades/page.tsx` | Crear — página CRUD completa |
| `src/app/(app)/terceros/page.tsx` | Modificar — agregar botón "Especialidades" |

---

## Task 1: Modelo de base de datos

**Files:**
- Modify: `prisma/schema.prisma` (después de la sección `Tercero`, antes de `Solicitudes`)

- [ ] **Step 1: Agregar el modelo `Especialidad` en `prisma/schema.prisma`**

Localizar la sección `// ─── Terceros / Debida Diligencia` (línea ~118). Agregar el nuevo modelo justo después del cierre del modelo `Tercero` (después de la línea `solicitudes Solicitud[]`):

```prisma
// ─── Especialidades ──────────────────────────────────────────────────────────

model Especialidad {
  id            Int      @id @default(autoincrement())
  nombre        String   @unique
  descripcion   String?
  creadoEn      DateTime @default(now())
  actualizadoEn DateTime @updatedAt
}
```

- [ ] **Step 2: Regenerar el cliente Prisma y empujar esquema a la base de datos**

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

- [ ] **Step 3: Verificar que el modelo existe en la base de datos**

```bash
cd solicitudes-indirectos
npm run db:studio
```

Abrir `http://localhost:5555` en el navegador. Verificar que aparece la tabla `Especialidad` en el panel izquierdo. Cerrar Prisma Studio con Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma solicitudes-indirectos/src/generated/prisma
git commit -m "feat: add Especialidad model to prisma schema"
```

---

## Task 2: Permiso `gestionar_especialidades`

**Files:**
- Modify: `src/lib/utils.ts` (línea ~304, array ADMIN)
- Modify: `src/app/(app)/configuracion/usuarios/page.tsx` (línea ~64, objeto FUNCIONALIDADES_BASE)

- [ ] **Step 1: Agregar el slug al array ADMIN en `utils.ts`**

Localizar (línea ~304):
```ts
  ADMIN: [
    "crear_terceros",
  ],
```

Reemplazar con:
```ts
  ADMIN: [
    "crear_terceros",
    "gestionar_especialidades",
  ],
```

- [ ] **Step 2: Agregar el slug a `FUNCIONALIDADES_BASE` en `configuracion/usuarios/page.tsx`**

Localizar (línea ~64):
```ts
  crear_terceros: { nombre: "Crear y gestionar terceros", rolPorDefecto: "ADMIN" },
};
```

Reemplazar con:
```ts
  crear_terceros: { nombre: "Crear y gestionar terceros", rolPorDefecto: "ADMIN" },
  gestionar_especialidades: { nombre: "Gestionar especialidades", rolPorDefecto: "ADMIN" },
};
```

- [ ] **Step 3: Verificar que no hay errores de TypeScript**

```bash
cd solicitudes-indirectos
npx tsc --noEmit
```

Salida esperada: ningún error (salida vacía o solo warnings que ya existían).

- [ ] **Step 4: Commit**

```bash
git add solicitudes-indirectos/src/lib/utils.ts solicitudes-indirectos/src/app/\(app\)/configuracion/usuarios/page.tsx
git commit -m "feat: add gestionar_especialidades permission slug"
```

---

## Task 3: API Route — GET + POST

**Files:**
- Create: `src/app/api/especialidades/route.ts`

- [ ] **Step 1: Crear el archivo `src/app/api/especialidades/route.ts`**

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tienePermiso } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const especialidades = await prisma.especialidad.findMany({
      orderBy: { nombre: "asc" },
    });

    return Response.json(especialidades);
  } catch (error) {
    console.error("GET /api/especialidades error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const roles = session.user.roles ?? [];
    const funcionalidadesAdicionales = session.user.funcionalidadesAdicionales ?? [];

    if (!tienePermiso(roles, funcionalidadesAdicionales, "gestionar_especialidades")) {
      return Response.json({ error: "No tiene permiso para gestionar especialidades" }, { status: 403 });
    }

    const body = await request.json();
    const nombre: string = body.nombre?.trim();
    const descripcion: string | null = body.descripcion?.trim() || null;

    if (!nombre) {
      return Response.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const existente = await prisma.especialidad.findUnique({ where: { nombre } });
    if (existente) {
      return Response.json({ error: "Ya existe una especialidad con ese nombre" }, { status: 409 });
    }

    const especialidad = await prisma.especialidad.create({
      data: { nombre, descripcion },
    });

    return Response.json(especialidad, { status: 201 });
  } catch (error) {
    console.error("POST /api/especialidades error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verificar que TypeScript compila sin errores**

```bash
cd solicitudes-indirectos
npx tsc --noEmit
```

Salida esperada: sin errores nuevos.

- [ ] **Step 3: Probar manualmente los endpoints**

Iniciar el servidor:
```bash
cd solicitudes-indirectos
npm run dev
```

En otra terminal, probar con curl (o en el navegador):
```bash
# GET — debe devolver array vacío []
curl -b "next-auth.session-token=..." http://localhost:3000/api/especialidades
```

- [ ] **Step 4: Commit**

```bash
git add solicitudes-indirectos/src/app/api/especialidades/route.ts
git commit -m "feat: add GET and POST /api/especialidades"
```

---

## Task 4: API Route — PATCH + DELETE

**Files:**
- Create: `src/app/api/especialidades/[id]/route.ts`

- [ ] **Step 1: Crear el directorio y archivo `src/app/api/especialidades/[id]/route.ts`**

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tienePermiso } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const roles = session.user.roles ?? [];
    const funcionalidadesAdicionales = session.user.funcionalidadesAdicionales ?? [];

    if (!tienePermiso(roles, funcionalidadesAdicionales, "gestionar_especialidades")) {
      return Response.json({ error: "No tiene permiso para gestionar especialidades" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const nombre: string | undefined = body.nombre?.trim();
    const descripcion: string | null | undefined =
      body.descripcion !== undefined ? body.descripcion?.trim() || null : undefined;

    if (nombre !== undefined && !nombre) {
      return Response.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }

    const existente = await prisma.especialidad.findUnique({ where: { id: Number(id) } });
    if (!existente) {
      return Response.json({ error: "Especialidad no encontrada" }, { status: 404 });
    }

    if (nombre && nombre !== existente.nombre) {
      const duplicado = await prisma.especialidad.findUnique({ where: { nombre } });
      if (duplicado) {
        return Response.json({ error: "Ya existe una especialidad con ese nombre" }, { status: 409 });
      }
    }

    const especialidad = await prisma.especialidad.update({
      where: { id: Number(id) },
      data: {
        ...(nombre !== undefined ? { nombre } : {}),
        ...(descripcion !== undefined ? { descripcion } : {}),
      },
    });

    return Response.json(especialidad);
  } catch (error) {
    console.error("PATCH /api/especialidades/[id] error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const roles = session.user.roles ?? [];
    const funcionalidadesAdicionales = session.user.funcionalidadesAdicionales ?? [];

    if (!tienePermiso(roles, funcionalidadesAdicionales, "gestionar_especialidades")) {
      return Response.json({ error: "No tiene permiso para gestionar especialidades" }, { status: 403 });
    }

    const { id } = await params;

    const existente = await prisma.especialidad.findUnique({ where: { id: Number(id) } });
    if (!existente) {
      return Response.json({ error: "Especialidad no encontrada" }, { status: 404 });
    }

    await prisma.especialidad.delete({ where: { id: Number(id) } });

    return Response.json({ message: "Especialidad eliminada correctamente" });
  } catch (error) {
    console.error("DELETE /api/especialidades/[id] error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verificar que TypeScript compila sin errores**

```bash
cd solicitudes-indirectos
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add solicitudes-indirectos/src/app/api/especialidades/
git commit -m "feat: add PATCH and DELETE /api/especialidades/[id]"
```

---

## Task 5: Página frontend CRUD

**Files:**
- Create: `src/app/(app)/terceros/especialidades/page.tsx`

- [ ] **Step 1: Crear `src/app/(app)/terceros/especialidades/page.tsx`**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Trash2, BookOpen, X, CheckCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { tienePermiso } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Especialidad {
  id: number;
  nombre: string;
  descripcion: string | null;
}

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

let toastId = 0;

// ─── Component ────────────────────────────────────────────────────────────────

export default function EspecialidadesPage() {
  const { data: session } = useSession();
  const roles = session?.user?.roles ?? [];
  const funcionalidadesAdicionales = session?.user?.funcionalidadesAdicionales ?? [];
  const canManage = tienePermiso(roles, funcionalidadesAdicionales, "gestionar_especialidades");

  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modal crear
  const [createModal, setCreateModal] = useState(false);
  const [createNombre, setCreateNombre] = useState("");
  const [createDescripcion, setCreateDescripcion] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal editar
  const [editModal, setEditModal] = useState(false);
  const [editItem, setEditItem] = useState<Especialidad | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal eliminar
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Especialidad | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const addToast = (type: Toast["type"], message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchEspecialidades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/especialidades", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setEspecialidades(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEspecialidades(); }, [fetchEspecialidades]);

  // ── Crear ─────────────────────────────────────────────────────────────────────

  function openCreate() {
    setCreateNombre("");
    setCreateDescripcion("");
    setCreateError(null);
    setCreateModal(true);
  }

  async function handleCreate() {
    setCreateError(null);
    if (!createNombre.trim()) {
      setCreateError("El nombre es requerido");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch("/api/especialidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: createNombre.trim(), descripcion: createDescripcion.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Error al crear");
        return;
      }
      setCreateModal(false);
      addToast("success", "Especialidad creada correctamente");
      await fetchEspecialidades();
    } catch {
      setCreateError("No se pudo conectar con el servidor");
    } finally {
      setCreateLoading(false);
    }
  }

  // ── Editar ────────────────────────────────────────────────────────────────────

  function openEdit(item: Especialidad) {
    setEditItem(item);
    setEditNombre(item.nombre);
    setEditDescripcion(item.descripcion ?? "");
    setEditError(null);
    setEditModal(true);
  }

  async function handleEdit() {
    if (!editItem) return;
    setEditError(null);
    if (!editNombre.trim()) {
      setEditError("El nombre es requerido");
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetch(`/api/especialidades/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: editNombre.trim(), descripcion: editDescripcion.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "Error al actualizar");
        return;
      }
      setEditModal(false);
      addToast("success", "Especialidad actualizada correctamente");
      await fetchEspecialidades();
    } catch {
      setEditError("No se pudo conectar con el servidor");
    } finally {
      setEditLoading(false);
    }
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────────

  function openDelete(item: Especialidad) {
    setDeleteItem(item);
    setDeleteModal(true);
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/especialidades/${deleteItem.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        addToast("error", data.error ?? "Error al eliminar");
        return;
      }
      setDeleteModal(false);
      addToast("success", "Especialidad eliminada correctamente");
      await fetchEspecialidades();
    } catch {
      addToast("error", "No se pudo conectar con el servidor");
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-lg px-4 py-3 text-sm shadow-lg text-white
              ${t.type === "success" ? "bg-green-600" : "bg-red-600"}`}
          >
            {t.type === "success"
              ? <CheckCircle size={15} className="mt-0.5 shrink-0" />
              : <X size={15} className="mt-0.5 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Especialidades</h1>
          <p className="text-sm text-gray-500 mt-0.5">Catálogo de especialidades de terceros</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus size={16} />
            Nueva Especialidad
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="md" />
            <span className="ml-3 text-sm text-gray-500">Cargando especialidades...</span>
          </div>
        ) : especialidades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-3">
              <BookOpen size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">Sin especialidades registradas</p>
            <p className="text-xs text-gray-500 mt-1">Crea la primera especialidad usando el botón de arriba.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                {["Nombre", "Descripción", "Acciones"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {especialidades.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{e.nombre}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">{e.descripcion ?? <span className="italic text-gray-400">—</span>}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {canManage && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(e)}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
                        >
                          <Pencil size={12} /> Editar
                        </button>
                        <button
                          onClick={() => openDelete(e)}
                          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          <Trash2 size={12} /> Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Nueva Especialidad</h2>
              <button onClick={() => setCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createNombre}
                  onChange={(e) => setCreateNombre(e.target.value)}
                  placeholder="Ej: Ingeniería Civil"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={createDescripcion}
                  onChange={(e) => setCreateDescripcion(e.target.value)}
                  placeholder="Descripción opcional..."
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {createError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{createError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => setCreateModal(false)} disabled={createLoading}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createLoading}>
                {createLoading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {editModal && editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Editar Especialidad</h2>
              <button onClick={() => setEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={editDescripcion}
                  onChange={(e) => setEditDescripcion(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {editError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{editError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => setEditModal(false)} disabled={editLoading}>
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={editLoading}>
                {editLoading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {deleteModal && deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Eliminar Especialidad</h2>
              <button onClick={() => setDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              ¿Eliminar <span className="font-semibold text-gray-900">"{deleteItem.nombre}"</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteModal(false)} disabled={deleteLoading}>
                Cancelar
              </Button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que TypeScript compila sin errores**

```bash
cd solicitudes-indirectos
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "solicitudes-indirectos/src/app/(app)/terceros/especialidades/page.tsx"
git commit -m "feat: add especialidades CRUD page"
```

---

## Task 6: Botón en la página de Terceros

**Files:**
- Modify: `src/app/(app)/terceros/page.tsx`

- [ ] **Step 1: Agregar `BookOpen` a los imports de lucide-react**

Localizar en `terceros/page.tsx` (línea ~8):
```tsx
import {
  Plus, Search, Users, CheckCircle, Clock,
  Eye, Pencil, RefreshCw, X, ChevronLeft, ChevronRight,
} from "lucide-react";
```

Reemplazar con:
```tsx
import {
  Plus, Search, Users, CheckCircle, Clock,
  Eye, Pencil, RefreshCw, X, ChevronLeft, ChevronRight, BookOpen,
} from "lucide-react";
```

- [ ] **Step 2: Agregar `Link` import si no está, y el permiso para gestionar especialidades**

`Link` ya está importado. Agregar la variable de permiso después de `canEdit` (línea ~51):
```tsx
const canManageEspecialidades = tienePermiso(roles, funcionalidadesAdicionales, "gestionar_especialidades");
```

- [ ] **Step 3: Agregar el botón en el header**

Localizar en el JSX del header (línea ~155):
```tsx
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : "Sincronizar SharePoint"}
          </Button>
          {canCreate && (
            <Link href="/terceros/nuevo">
              <Button>
                <Plus size={16} />
                Nuevo Tercero
              </Button>
            </Link>
          )}
        </div>
```

Reemplazar con:
```tsx
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : "Sincronizar SharePoint"}
          </Button>
          {canManageEspecialidades && (
            <Link href="/terceros/especialidades">
              <Button variant="secondary">
                <BookOpen size={15} />
                Especialidades
              </Button>
            </Link>
          )}
          {canCreate && (
            <Link href="/terceros/nuevo">
              <Button>
                <Plus size={16} />
                Nuevo Tercero
              </Button>
            </Link>
          )}
        </div>
```

- [ ] **Step 4: Verificar que TypeScript compila sin errores**

```bash
cd solicitudes-indirectos
npx tsc --noEmit
```

- [ ] **Step 5: Probar en el navegador**

Con el servidor ya corriendo en `http://localhost:3000`, iniciar sesión como `admin@baiak.com` (password: `Admin123!`). Navegar a Terceros. Verificar que aparece el botón "Especialidades". Hacer clic y confirmar que carga la página `/terceros/especialidades`. Crear, editar y eliminar una especialidad de prueba. Verificar que los toasts de confirmación aparecen.

- [ ] **Step 6: Commit final**

```bash
git add "solicitudes-indirectos/src/app/(app)/terceros/page.tsx"
git commit -m "feat: add Especialidades button to terceros header"
```
