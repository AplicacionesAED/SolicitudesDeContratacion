# Especialidades — Diseño

**Fecha:** 2026-06-03
**Módulo:** Terceros / Debida Diligencia
**Alcance:** CRUD completo de especialidades con permiso configurable por usuario

---

## Contexto

El módulo de Terceros necesita un catálogo de especialidades gestionable. Se accede desde un botón "Especialidades" en la página de terceros. Solo ADMIN tiene el permiso por defecto, pero puede asignarse a cualquier usuario vía checkbox en la configuración de usuarios.

---

## Modelo de datos

```prisma
model Especialidad {
  id            Int      @id @default(autoincrement())
  nombre        String   @unique
  descripcion   String?
  creadoEn      DateTime @default(now())
  actualizadoEn DateTime @updatedAt
}
```

- `nombre`: requerido, único
- `descripcion`: opcional

---

## Permiso

**Slug:** `gestionar_especialidades`

Cambios requeridos:
- `src/lib/utils.ts` → agregar `gestionar_especialidades` a `FUNCIONALIDADES_POR_ROL.ADMIN`
- `src/app/(app)/configuracion/usuarios/page.tsx` → agregar entrada en `FUNCIONALIDADES_BASE`:
  ```ts
  gestionar_especialidades: { nombre: "Gestionar especialidades", rolPorDefecto: "ADMIN" }
  ```

---

## API Routes

| Método | Ruta | Descripción | Permiso requerido |
|--------|------|-------------|-------------------|
| GET | `/api/especialidades` | Lista todas, ordenadas por nombre asc | Autenticado |
| POST | `/api/especialidades` | Crea una especialidad | `gestionar_especialidades` |
| PATCH | `/api/especialidades/[id]` | Actualiza nombre y/o descripción | `gestionar_especialidades` |
| DELETE | `/api/especialidades/[id]` | Elimina una especialidad | `gestionar_especialidades` |

### Validaciones

- `nombre` requerido, no vacío
- `nombre` único — retorna 409 si ya existe
- `id` debe existir en PATCH/DELETE — retorna 404 si no

---

## Frontend

### Botón en `/terceros/page.tsx`

- Agregar botón "Especialidades" en el header, entre "Sincronizar SharePoint" y "Nuevo Tercero"
- Visible solo si `tienePermiso(roles, funcionalidadesAdicionales, "gestionar_especialidades")`
- Usa `<Link href="/terceros/especialidades">` con ícono `BookOpen` (lucide)

### Página `/terceros/especialidades/page.tsx`

**Header:**
- Título: "Especialidades"
- Subtítulo: "Catálogo de especialidades de terceros"
- Botón "+ Nueva Especialidad" (requiere permiso)

**Tabla:**
| Columna | Descripción |
|---------|-------------|
| Nombre | Texto del nombre |
| Descripción | Texto o "—" si está vacío |
| Acciones | Editar · Eliminar |

**Modales:**
- **Crear / Editar:** Modal inline con campos `nombre` (input requerido) y `descripcion` (textarea opcional). Botones Cancelar / Guardar.
- **Eliminar:** Confirmación simple: "¿Eliminar '[nombre]'? Esta acción no se puede deshacer." Botones Cancelar / Eliminar.

**Patrones seguidos:** igual a `configuracion/frentes/page.tsx` (estado local, fetch al cargar, toasts de éxito/error, sin paginación inicial dado que el catálogo será pequeño).

---

## Archivos a crear/modificar

| Archivo | Operación |
|---------|-----------|
| `prisma/schema.prisma` | Agregar modelo `Especialidad` |
| `src/generated/prisma/` | Regenerar cliente (comando) |
| `src/lib/utils.ts` | Agregar slug a `FUNCIONALIDADES_POR_ROL.ADMIN` |
| `src/app/api/especialidades/route.ts` | Nuevo — GET + POST |
| `src/app/api/especialidades/[id]/route.ts` | Nuevo — PATCH + DELETE |
| `src/app/(app)/terceros/especialidades/page.tsx` | Nuevo — página CRUD |
| `src/app/(app)/terceros/page.tsx` | Modificar — agregar botón |
| `src/app/(app)/configuracion/usuarios/page.tsx` | Modificar — agregar a FUNCIONALIDADES_BASE |

---

## Flujo de usuario

1. Usuario con permiso entra a Terceros
2. Ve botón "Especialidades" en el header → hace clic
3. Ve lista de especialidades con Nombre y Descripción
4. Puede crear, editar o eliminar especialidades desde modales inline
5. Los cambios se reflejan inmediatamente en la tabla
