# Roles Dinámicos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover la configuración de funcionalidades por rol a la base de datos, agregar el rol GERENCIA, y crear un módulo CRUD en `/configuracion/roles` para que el admin gestione roles desde la UI.

**Architecture:** Nuevo modelo `Rol` en Prisma almacena slug, nombre, funcionalidades (JSON), verTodasSolicitudes y flag protegido. Nuevo archivo `src/lib/roles.ts` expone helpers server-side para consultar el mapa de DB. `tienePermiso` recibe el mapa como 4º parámetro opcional — compatibilidad total con callers existentes.

**Tech Stack:** Next.js 16 App Router · Prisma 7 + PrismaPg adapter · next-auth v4 · Tailwind CSS v4 · TypeScript

---

## Archivos a crear / modificar

| Archivo | Acción |
|---|---|
| `prisma/schema.prisma` | Agregar modelo `Rol` |
| `prisma/seed.ts` | Upsert registros para todos los roles + GERENCIA |
| `src/lib/roles.ts` | **Nuevo**: `getRolesFuncionalidades()`, `getRolesVerTodas()` (server-only) |
| `src/lib/utils.ts` | Agregar GERENCIA, `FUNCIONALIDADES_DISPONIBLES`; actualizar `tienePermiso` con 4º param opcional |
| `src/app/api/config/roles/route.ts` | **Nuevo**: GET (lista) + POST (crear) |
| `src/app/api/config/roles/[slug]/route.ts` | **Nuevo**: PUT (editar) + DELETE (eliminar) |
| `src/app/api/solicitudes/route.ts` | Reemplazar `ROLES_VER_TODAS` hardcodeado por consulta DB |
| `src/app/api/solicitudes/[id]/estado/route.ts` | Pasar mapa DB a `tienePermiso` |
| `src/app/(app)/configuracion/roles/page.tsx` | **Nuevo**: UI del módulo |
| `src/app/(app)/configuracion/page.tsx` | Agregar card Roles |

---

## Task 1: Agregar modelo `Rol` al schema de Prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar el modelo Rol al schema**

Abrir `prisma/schema.prisma` y agregar este bloque después del comentario `// ─── Usuarios y Roles`:

```prisma
model Rol {
  slug                String   @id
  nombre              String
  descripcion         String?
  funcionalidades     String   @default("[]")
  verTodasSolicitudes Boolean  @default(false)
  protegido           Boolean  @default(false)
  creadoEn            DateTime @default(now())
  actualizadoEn       DateTime @updatedAt
}
```

- [ ] **Step 2: Regenerar cliente Prisma y pushear schema**

```bash
cd solicitudes-indirectos
npm run db:generate
npm run db:push
```

Resultado esperado: `All migrations have been applied` o `The database is already in sync`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma solicitudes-indirectos/src/generated/prisma
git commit -m "feat(db): add Rol model for dynamic role configuration"
```

---

## Task 2: Crear `src/lib/roles.ts`

**Files:**
- Create: `solicitudes-indirectos/src/lib/roles.ts`

> **Nota importante:** Este archivo solo contiene funciones server-side (usan Prisma). `FUNCIONALIDADES_DISPONIBLES` va en `utils.ts` (Task 3) porque la UI page es un Client Component y no puede importar módulos Node-only.

- [ ] **Step 1: Crear el archivo con los helpers server-side**

Crear `solicitudes-indirectos/src/lib/roles.ts` con este contenido exacto:

```typescript
import { prisma } from "@/lib/prisma";
import { FUNCIONALIDADES_POR_ROL } from "@/lib/utils";

const FALLBACK_VER_TODAS = ["CONTRATOS", "CONTROLES", "DIRECTOR_CONTROLES", "DIRECTOR_TECNICO", "ADMIN", "GERENCIA"];

export async function getRolesFuncionalidades(): Promise<Record<string, string[]>> {
  try {
    const roles = await prisma.rol.findMany();
    if (roles.length === 0) return FUNCIONALIDADES_POR_ROL;
    return Object.fromEntries(
      roles.map((r) => [r.slug, JSON.parse(r.funcionalidades) as string[]])
    );
  } catch {
    return FUNCIONALIDADES_POR_ROL;
  }
}

export async function getRolesVerTodas(): Promise<string[]> {
  try {
    const roles = await prisma.rol.findMany({ where: { verTodasSolicitudes: true } });
    if (roles.length === 0) return FALLBACK_VER_TODAS;
    return roles.map((r) => r.slug);
  } catch {
    return FALLBACK_VER_TODAS;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add solicitudes-indirectos/src/lib/roles.ts
git commit -m "feat(lib): add roles.ts with FUNCIONALIDADES_DISPONIBLES and DB helpers"
```

---

## Task 3: Actualizar `src/lib/utils.ts`

**Files:**
- Modify: `solicitudes-indirectos/src/lib/utils.ts` (líneas 266–333)

- [ ] **Step 1: Agregar FUNCIONALIDADES_DISPONIBLES (antes de ROL_LABELS)**

Insertar este bloque justo antes de la línea `export const ROL_LABELS`:

```typescript
export const FUNCIONALIDADES_DISPONIBLES: Record<string, { nombre: string; descripcion: string }> = {
  crear_enviar_solicitudes: {
    nombre: "Crear y enviar solicitudes",
    descripcion: "Crear nuevas solicitudes y enviarlas al flujo de aprobación",
  },
  crear_otrosi: {
    nombre: "Crear otrosís",
    descripcion: "Crear otrosís sobre contratos completados",
  },
  crear_solicitudes_diseno: {
    nombre: "Crear solicitudes de diseño",
    descripcion: "Crear solicitudes de tipo diseño técnico",
  },
  aprobar_director_tecnico: {
    nombre: "Aprobación técnica",
    descripcion: "Aprobar solicitudes en etapa de Director Técnico",
  },
  aprobar_solicitudes_frente: {
    nombre: "Aprobar solicitudes del frente",
    descripcion: "Aprobar solicitudes asignadas como Director de Proyecto",
  },
  revisar_contratos: {
    nombre: "Gestionar contratos",
    descripcion: "Tramitar solicitudes, crear minutas y enviar a controles",
  },
  registrar_adpro: {
    nombre: "Registrar en ADPRO",
    descripcion: "Registrar el número de contrato en el sistema ADPRO",
  },
  aprobacion_final: {
    nombre: "Aprobación final",
    descripcion: "Dar aprobación definitiva como Director de Controles",
  },
  crear_terceros: {
    nombre: "Crear y gestionar terceros",
    descripcion: "Gestionar directorio de terceros y debida diligencia",
  },
  gestionar_especialidades: {
    nombre: "Gestionar especialidades",
    descripcion: "Crear, editar y eliminar especialidades de terceros",
  },
};
```

- [ ] **Step 3: Agregar GERENCIA a ROL_LABELS**

Localizar el bloque `ROL_LABELS` y agregar la entrada `GERENCIA`:

```typescript
export const ROL_LABELS: Record<string, string> = {
  SOLICITANTE: "Solicitante",
  TECNICA: "Coordinador de Técnica",
  DIRECTOR_TECNICO: "Director Técnico",
  DIRECTOR_PROYECTO: "Director de Proyecto",
  CONTRATOS: "Contratos",
  CONTROLES: "Coordinador Controles",
  DIRECTOR_CONTROLES: "Director de Controles",
  GERENCIA: "Gerencia",
  ADMIN: "Administrador",
};
```

- [ ] **Step 4: Agregar GERENCIA a FUNCIONALIDADES_POR_ROL**

Localizar `FUNCIONALIDADES_POR_ROL` (línea ~278) y agregar la entrada vacía para GERENCIA antes de ADMIN:

```typescript
  GERENCIA: [],
  ADMIN: [
    "crear_terceros",
    "gestionar_especialidades",
  ],
```

- [ ] **Step 5: Actualizar la firma de tienePermiso con 4º parámetro opcional**

Reemplazar la función `tienePermiso` completa (línea ~317):

```typescript
export function tienePermiso(
  roles: string[],
  funcionalidadesAdicionales: string[],
  funcionalidad: string,
  funcionalidadesPorRol: Record<string, string[]> = FUNCIONALIDADES_POR_ROL
): boolean {
  if (roles.includes("ADMIN")) return true;
  const funcionalidadesDelRol = roles.flatMap(
    (rol) => funcionalidadesPorRol[rol] || []
  );
  return (
    funcionalidadesDelRol.includes(funcionalidad) ||
    funcionalidadesAdicionales.includes(funcionalidad)
  );
}
```

- [ ] **Step 6: Verificar que el proyecto compila**

```bash
cd solicitudes-indirectos && npm run build 2>&1 | tail -20
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Step 7: Commit**

```bash
git add solicitudes-indirectos/src/lib/utils.ts
git commit -m "feat(utils): add FUNCIONALIDADES_DISPONIBLES, GERENCIA role, update tienePermiso with optional roles map param"
```

---

## Task 4: Actualizar `prisma/seed.ts` para seedear la tabla Rol

**Files:**
- Modify: `solicitudes-indirectos/prisma/seed.ts`

- [ ] **Step 1: Agregar el bloque de seed de roles al final de `main()`**

Localizar el final de la función `main()` en `prisma/seed.ts` (justo antes del cierre `}`) e insertar:

```typescript
  // ─── Roles ───────────────────────────────────────────────────────────────────
  const rolesData = [
    { slug: "SOLICITANTE",       nombre: "Solicitante",             funcionalidades: ["crear_enviar_solicitudes", "crear_otrosi"],                                  verTodasSolicitudes: false, protegido: true },
    { slug: "TECNICA",           nombre: "Coordinador de Técnica",  funcionalidades: ["crear_enviar_solicitudes", "crear_otrosi", "crear_solicitudes_diseno"],       verTodasSolicitudes: false, protegido: true },
    { slug: "DIRECTOR_TECNICO",  nombre: "Director Técnico",        funcionalidades: ["aprobar_director_tecnico"],                                                   verTodasSolicitudes: false, protegido: true },
    { slug: "DIRECTOR_PROYECTO", nombre: "Director de Proyecto",    funcionalidades: ["crear_enviar_solicitudes", "aprobar_solicitudes_frente"],                     verTodasSolicitudes: false, protegido: true },
    { slug: "CONTRATOS",         nombre: "Contratos",               funcionalidades: ["revisar_contratos"],                                                          verTodasSolicitudes: true,  protegido: true },
    { slug: "CONTROLES",         nombre: "Coordinador Controles",   funcionalidades: ["registrar_adpro"],                                                            verTodasSolicitudes: true,  protegido: true },
    { slug: "DIRECTOR_CONTROLES",nombre: "Director de Controles",   funcionalidades: ["aprobacion_final"],                                                           verTodasSolicitudes: true,  protegido: true },
    { slug: "GERENCIA",          nombre: "Gerencia",                funcionalidades: [],                                                                             verTodasSolicitudes: true,  protegido: true },
    { slug: "ADMIN",             nombre: "Administrador",           funcionalidades: ["crear_terceros", "gestionar_especialidades"],                                 verTodasSolicitudes: true,  protegido: true },
  ];

  for (const r of rolesData) {
    await prisma.rol.upsert({
      where: { slug: r.slug },
      update: {},
      create: {
        slug: r.slug,
        nombre: r.nombre,
        funcionalidades: JSON.stringify(r.funcionalidades),
        verTodasSolicitudes: r.verTodasSolicitudes,
        protegido: r.protegido,
      },
    });
  }

  console.log("✅ Roles seeded");
```

- [ ] **Step 2: Ejecutar el seed**

```bash
cd solicitudes-indirectos && npm run db:seed
```

Resultado esperado: `✅ Roles seeded` al final de la salida.

- [ ] **Step 3: Commit**

```bash
git add solicitudes-indirectos/prisma/seed.ts
git commit -m "feat(seed): seed Rol table with default roles and GERENCIA"
```

---

## Task 5: Crear `GET + POST /api/config/roles`

**Files:**
- Create: `solicitudes-indirectos/src/app/api/config/roles/route.ts`

- [ ] **Step 1: Crear el archivo de ruta**

Crear `solicitudes-indirectos/src/app/api/config/roles/route.ts`:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseRol(r: { slug: string; nombre: string; descripcion: string | null; funcionalidades: string; verTodasSolicitudes: boolean; protegido: boolean; creadoEn: Date; actualizadoEn: Date }) {
  return { ...r, funcionalidades: JSON.parse(r.funcionalidades) as string[] };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return Response.json({ error: "Solo ADMIN" }, { status: 403 });

  const roles = await prisma.rol.findMany({ orderBy: { creadoEn: "asc" } });
  return Response.json(roles.map(parseRol));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return Response.json({ error: "Solo ADMIN" }, { status: 403 });

  const body = await request.json() as {
    nombre?: string;
    descripcion?: string;
    funcionalidades?: string[];
    verTodasSolicitudes?: boolean;
  };

  if (!body.nombre?.trim()) {
    return Response.json({ error: "nombre es requerido" }, { status: 400 });
  }

  const slug = body.nombre
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

  if (!slug) {
    return Response.json({ error: "Nombre inválido — no genera un slug válido" }, { status: 400 });
  }

  const existing = await prisma.rol.findUnique({ where: { slug } });
  if (existing) {
    return Response.json({ error: `Ya existe un rol con el slug "${slug}"` }, { status: 409 });
  }

  const rol = await prisma.rol.create({
    data: {
      slug,
      nombre: body.nombre.trim(),
      descripcion: body.descripcion?.trim() || null,
      funcionalidades: JSON.stringify(body.funcionalidades ?? []),
      verTodasSolicitudes: body.verTodasSolicitudes ?? false,
      protegido: false,
    },
  });

  return Response.json(parseRol(rol), { status: 201 });
}
```

- [ ] **Step 2: Verificar que compila**

```bash
cd solicitudes-indirectos && npm run build 2>&1 | grep -E "error|Error" | head -10
```

Sin errores.

- [ ] **Step 3: Commit**

```bash
git add solicitudes-indirectos/src/app/api/config/roles/route.ts
git commit -m "feat(api): GET and POST /api/config/roles"
```

---

## Task 6: Crear `PUT + DELETE /api/config/roles/[slug]`

**Files:**
- Create: `solicitudes-indirectos/src/app/api/config/roles/[slug]/route.ts`

- [ ] **Step 1: Crear el archivo de ruta**

Crear `solicitudes-indirectos/src/app/api/config/roles/[slug]/route.ts`:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseRol(r: { slug: string; nombre: string; descripcion: string | null; funcionalidades: string; verTodasSolicitudes: boolean; protegido: boolean; creadoEn: Date; actualizadoEn: Date }) {
  return { ...r, funcionalidades: JSON.parse(r.funcionalidades) as string[] };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return Response.json({ error: "Solo ADMIN" }, { status: 403 });

  const { slug } = await params;
  const rol = await prisma.rol.findUnique({ where: { slug } });
  if (!rol) return Response.json({ error: "Rol no encontrado" }, { status: 404 });

  const body = await request.json() as {
    nombre?: string;
    descripcion?: string;
    funcionalidades?: string[];
    verTodasSolicitudes?: boolean;
  };

  const updated = await prisma.rol.update({
    where: { slug },
    data: {
      ...(body.nombre !== undefined ? { nombre: body.nombre.trim() } : {}),
      ...(body.descripcion !== undefined ? { descripcion: body.descripcion?.trim() || null } : {}),
      ...(body.funcionalidades !== undefined ? { funcionalidades: JSON.stringify(body.funcionalidades) } : {}),
      ...(body.verTodasSolicitudes !== undefined ? { verTodasSolicitudes: body.verTodasSolicitudes } : {}),
    },
  });

  return Response.json(parseRol(updated));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return Response.json({ error: "Solo ADMIN" }, { status: 403 });

  const { slug } = await params;
  const rol = await prisma.rol.findUnique({ where: { slug } });
  if (!rol) return Response.json({ error: "Rol no encontrado" }, { status: 404 });
  if (rol.protegido) {
    return Response.json({ error: "Los roles del sistema no se pueden eliminar" }, { status: 400 });
  }

  await prisma.rol.delete({ where: { slug } });
  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add solicitudes-indirectos/src/app/api/config/roles/[slug]/route.ts
git commit -m "feat(api): PUT and DELETE /api/config/roles/[slug]"
```

---

## Task 7: Actualizar visibilidad en `GET /api/solicitudes`

**Files:**
- Modify: `solicitudes-indirectos/src/app/api/solicitudes/route.ts`

- [ ] **Step 1: Agregar import de getRolesVerTodas**

En `solicitudes/route.ts`, reemplazar la línea de import actual:

```typescript
import { buildConsecutivo, abbreviate, normalizeFrenteName, tienePermiso } from "@/lib/utils";
```

Por:

```typescript
import { buildConsecutivo, abbreviate, normalizeFrenteName, tienePermiso } from "@/lib/utils";
import { getRolesVerTodas } from "@/lib/roles";
```

- [ ] **Step 2: Reemplazar la constante hardcodeada y su uso**

Eliminar la línea (línea 7):

```typescript
const ROLES_VER_TODAS: string[] = ["CONTRATOS", "CONTROLES", "DIRECTOR_CONTROLES", "DIRECTOR_TECNICO", "ADMIN"];
```

Dentro del handler `GET`, reemplazar:

```typescript
    if (!userRoles.some((r) => ROLES_VER_TODAS.includes(r))) {
```

Por:

```typescript
    const rolesVerTodas = await getRolesVerTodas();
    if (!userRoles.some((r) => rolesVerTodas.includes(r))) {
```

- [ ] **Step 3: Verificar que compila**

```bash
cd solicitudes-indirectos && npm run build 2>&1 | grep -E "error TS" | head -10
```

Sin errores TypeScript.

- [ ] **Step 4: Commit**

```bash
git add solicitudes-indirectos/src/app/api/solicitudes/route.ts
git commit -m "feat(api): use DB roles for solicitudes visibility check"
```

---

## Task 8: Actualizar `tienePermiso` en la ruta de estado

**Files:**
- Modify: `solicitudes-indirectos/src/app/api/solicitudes/[id]/estado/route.ts`

- [ ] **Step 1: Agregar import de getRolesFuncionalidades**

En `estado/route.ts` (líneas 1–13), añadir el import:

```typescript
import { getRolesFuncionalidades } from "@/lib/roles";
```

La sección de imports queda:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tienePermiso } from "@/lib/utils";
import { getRolesFuncionalidades } from "@/lib/roles";
import {
  notificarNuevaSolicitud,
  notificarAprobadaDirector,
  notificarDevuelta,
  notificarEnRevision,
  notificarControles,
  notificarAdproRegistrado,
  notificarCompletada,
} from "@/lib/notifications";
```

- [ ] **Step 2: Pasar el mapa de DB a tienePermiso**

Localizar el bloque de validación de permiso (líneas ~131–145):

```typescript
    const userRoles: string[] = session.user.roles ?? [session.user.rol];
    const funcionalidadesAdicionales: string[] = session.user.funcionalidadesAdicionales ?? [];
    const userId = session.user.id;

    // Validate permission
    const tieneAlgunPermiso = transicion.permisosPermitidos.some((p) =>
      tienePermiso(userRoles, funcionalidadesAdicionales, p)
    );
```

Reemplazar por:

```typescript
    const userRoles: string[] = session.user.roles ?? [session.user.rol];
    const funcionalidadesAdicionales: string[] = session.user.funcionalidadesAdicionales ?? [];
    const userId = session.user.id;

    const funcionalidadesPorRol = await getRolesFuncionalidades();
    const tieneAlgunPermiso = transicion.permisosPermitidos.some((p) =>
      tienePermiso(userRoles, funcionalidadesAdicionales, p, funcionalidadesPorRol)
    );
```

- [ ] **Step 3: Verificar que compila**

```bash
cd solicitudes-indirectos && npm run build 2>&1 | grep -E "error TS" | head -10
```

Sin errores.

- [ ] **Step 4: Commit**

```bash
git add solicitudes-indirectos/src/app/api/solicitudes/[id]/estado/route.ts
git commit -m "feat(api): use DB roles map in estado permission check"
```

---

## Task 9: Crear la página UI `/configuracion/roles`

**Files:**
- Create: `solicitudes-indirectos/src/app/(app)/configuracion/roles/page.tsx`

- [ ] **Step 1: Crear el archivo de página**

Crear `solicitudes-indirectos/src/app/(app)/configuracion/roles/page.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Trash2, Shield, ShieldCheck, X, Settings } from "lucide-react";
import { FUNCIONALIDADES_DISPONIBLES } from "@/lib/utils";
import { Spinner } from "@/shared/ui/spinner";

interface Rol {
  slug: string;
  nombre: string;
  descripcion: string | null;
  funcionalidades: string[];
  verTodasSolicitudes: boolean;
  protegido: boolean;
}

interface FormData {
  nombre: string;
  descripcion: string;
  funcionalidades: string[];
  verTodasSolicitudes: boolean;
}

const EMPTY_FORM: FormData = {
  nombre: "",
  descripcion: "",
  funcionalidades: [],
  verTodasSolicitudes: false,
};

export default function RolesPage() {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRol, setEditingRol] = useState<Rol | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/config/roles");
    if (res.ok) setRoles(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const openCreate = () => {
    setEditingRol(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (rol: Rol) => {
    setEditingRol(rol);
    setForm({
      nombre: rol.nombre,
      descripcion: rol.descripcion ?? "",
      funcionalidades: rol.funcionalidades,
      verTodasSolicitudes: rol.verTodasSolicitudes,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const url = editingRol
        ? `/api/config/roles/${editingRol.slug}`
        : "/api/config/roles";
      const method = editingRol ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setFormError(data.error ?? "Error desconocido");
        return;
      }
      setModalOpen(false);
      await fetchRoles();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rol: Rol) => {
    if (!confirm(`¿Eliminar el rol "${rol.nombre}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/config/roles/${rol.slug}`, { method: "DELETE" });
    if (res.ok) await fetchRoles();
  };

  const toggleFuncionalidad = (slug: string) => {
    setForm((f) => ({
      ...f,
      funcionalidades: f.funcionalidades.includes(slug)
        ? f.funcionalidades.filter((s) => s !== slug)
        : [...f.funcionalidades, slug],
    }));
  };

  if (session?.user?.rol !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-sm">
          <Settings size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No tienes permiso para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestiona los roles del sistema y sus permisos
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nuevo Rol
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Funcionalidades</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                  Ve todas
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.map((rol) => (
                <tr key={rol.slug} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{rol.nombre}</span>
                      {rol.protegido && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          Sistema
                        </span>
                      )}
                    </div>
                    {rol.descripcion && (
                      <p className="text-xs text-gray-400 mt-0.5">{rol.descripcion}</p>
                    )}
                    <p className="text-xs text-gray-300 font-mono mt-0.5">{rol.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {rol.funcionalidades.length === 0 ? (
                        <span className="text-xs text-gray-400">Sin funcionalidades</span>
                      ) : (
                        rol.funcionalidades.map((f) => (
                          <span
                            key={f}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                          >
                            {FUNCIONALIDADES_DISPONIBLES[f]?.nombre ?? f}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {rol.verTodasSolicitudes ? (
                      <ShieldCheck size={16} className="text-green-500" />
                    ) : (
                      <Shield size={16} className="text-gray-300" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(rol)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      {!rol.protegido && (
                        <button
                          onClick={() => handleDelete(rol)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear / editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingRol ? `Editar: ${editingRol.nombre}` : "Nuevo Rol"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {!editingRol && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="ej. Coordinador de Obra"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Descripción del rol"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Funcionalidades</p>
                <div className="space-y-1">
                  {Object.entries(FUNCIONALIDADES_DISPONIBLES).map(([slug, info]) => (
                    <label
                      key={slug}
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-blue-600"
                        checked={form.funcionalidades.includes(slug)}
                        onChange={() => toggleFuncionalidad(slug)}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{info.nombre}</p>
                        <p className="text-xs text-gray-400">{info.descripcion}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-blue-600"
                    checked={form.verTodasSolicitudes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, verTodasSolicitudes: e.target.checked }))
                    }
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Ver todas las solicitudes
                    </p>
                    <p className="text-xs text-gray-400">
                      Permite ver solicitudes de todos los frentes, no solo los asignados al usuario
                    </p>
                  </div>
                </label>
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Guardando..." : editingRol ? "Guardar cambios" : "Crear rol"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

```bash
cd solicitudes-indirectos && npm run build 2>&1 | grep -E "error TS" | head -10
```

Sin errores.

- [ ] **Step 3: Commit**

```bash
git add solicitudes-indirectos/src/app/\(app\)/configuracion/roles/page.tsx
git commit -m "feat(ui): roles management page at /configuracion/roles"
```

---

## Task 10: Agregar card de Roles a la página de Configuración

**Files:**
- Modify: `solicitudes-indirectos/src/app/(app)/configuracion/page.tsx`

- [ ] **Step 1: Agregar import de Shield y la card**

En `configuracion/page.tsx`, reemplazar el import de lucide-react:

```typescript
import { Users, MapPin, Settings, Shield } from "lucide-react";
```

Agregar el objeto de la card de Roles al array `CARDS`:

```typescript
  {
    title: "Roles y Permisos",
    description: "Configura los roles del sistema y las funcionalidades que tiene cada uno.",
    href: "/configuracion/roles",
    icon: Shield,
    color: "bg-green-50 text-green-600",
  },
```

- [ ] **Step 2: Verificar que el build final pasa**

```bash
cd solicitudes-indirectos && npm run build 2>&1 | tail -5
```

Resultado esperado: `✓ Compiled successfully` o similar sin errores.

- [ ] **Step 3: Commit final**

```bash
git add solicitudes-indirectos/src/app/\(app\)/configuracion/page.tsx
git commit -m "feat(ui): add Roles card to configuracion index"
```

---

## Task 11: Verificación end-to-end

- [ ] **Step 1: Levantar el servidor de desarrollo**

```bash
cd solicitudes-indirectos && npm run dev
```

- [ ] **Step 2: Verificar flujo completo como admin**

1. Ingresar como `admin@baiak.com` / `Admin123!`
2. Ir a `/configuracion` — debe aparecer la card "Roles y Permisos"
3. Ir a `/configuracion/roles` — debe listar los 9 roles (8 existentes + GERENCIA)
4. Crear un rol nuevo con algunas funcionalidades — confirmar que aparece en la tabla
5. Editar el rol nuevo, cambiar funcionalidades — confirmar que se guardan
6. Eliminar el rol custom — confirmar que desaparece
7. Intentar eliminar un rol del sistema (ej. SOLICITANTE) — debe mostrar error "no se puede eliminar"

- [ ] **Step 3: Verificar que el usuario con rol GERENCIA ve todas las solicitudes**

1. Crear un usuario con rol GERENCIA desde `/configuracion/usuarios`
2. Iniciar sesión con ese usuario
3. Ir a `/solicitudes` — debe ver todas las solicitudes (no solo las propias)
4. Confirmar que no tiene botones de acción (Enviar, Aprobar, etc.)
