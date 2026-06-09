# Módulo de Roles Dinámicos

**Fecha:** 2026-06-09  
**Proyecto:** Solicitudes Indirectos — Baia Kristal  
**Estado:** Aprobado

---

## Objetivo

Mover la configuración de roles y sus funcionalidades del código hardcodeado a la base de datos, permitiendo que el administrador gestione desde la UI qué funcionalidades tiene cada rol, y pueda crear roles nuevos o eliminar los que no sean del sistema. Se agrega también el nuevo rol `GERENCIA`.

---

## Alcance

- Nuevo modelo `Rol` en Prisma con slug, nombre, descripción, funcionalidades (JSON), visibilidad total y flag de protegido.
- Nuevo rol `GERENCIA`: ve todas las solicitudes, sin acciones.
- Módulo UI en `/configuracion/roles` (solo ADMIN).
- API CRUD para roles.
- `tienePermiso` actualizado para consultar DB en rutas server-side.
- Visibilidad de solicitudes (`verTodasSolicitudes`) configurable por rol.

**Fuera de alcance:**
- Creación de nuevos slugs de funcionalidades desde UI (los slugs mapean a código, deben existir en el registro `FUNCIONALIDADES_DISPONIBLES`).
- Cambio del sistema de autenticación (next-auth) o estructura de sesión.

---

## Modelo de datos

```prisma
model Rol {
  slug                String   @id        // ej: "SOLICITANTE", "GERENCIA", "ROL_CUSTOM_1"
  nombre              String
  descripcion         String?
  funcionalidades     String   @default("[]")  // JSON: string[]
  verTodasSolicitudes Boolean  @default(false)
  protegido           Boolean  @default(false) // si true, no se puede eliminar desde UI
  creadoEn            DateTime @default(now())
  actualizadoEn       DateTime @updatedAt
}
```

Los roles existentes y `GERENCIA` se seedean como `protegido: true`.  
Roles creados desde UI son `protegido: false`.

---

## Funcionalidades disponibles (fijas en código)

Registro `FUNCIONALIDADES_DISPONIBLES` en `src/lib/roles.ts`:

| Slug | Descripción |
|---|---|
| `crear_enviar_solicitudes` | Crear y enviar solicitudes |
| `crear_otrosi` | Crear otrosí |
| `crear_solicitudes_diseno` | Crear solicitudes de diseño |
| `aprobar_solicitudes_frente` | Aprobar como Director de Proyecto |
| `revisar_contratos` | Gestionar contratos y minutas |
| `registrar_adpro` | Registrar en ADPRO |
| `aprobacion_final` | Aprobación final (Director Controles) |
| `aprobar_director_tecnico` | Aprobación técnica |
| `crear_terceros` | Crear y editar terceros |
| `gestionar_especialidades` | Gestionar especialidades |

Estos slugs no cambian — mapean a rutas específicas del flujo de trabajo en código.

---

## Nuevo rol: GERENCIA

```json
{
  "slug": "GERENCIA",
  "nombre": "Gerencia",
  "descripcion": "Acceso de solo lectura a todas las solicitudes.",
  "funcionalidades": [],
  "verTodasSolicitudes": true,
  "protegido": true
}
```

---

## Sistema de permisos actualizado

### `tienePermiso` (src/lib/utils.ts)

Firma actualizada con 4º parámetro opcional para compatibilidad con callers existentes:

```typescript
export function tienePermiso(
  roles: string[],
  funcionalidadesAdicionales: string[],
  funcionalidad: string,
  funcionalidadesPorRol: Record<string, string[]> = FUNCIONALIDADES_POR_ROL
): boolean
```

El fallback al mapa hardcodeado garantiza que componentes client-side no rompan mientras no reciben el mapa de DB.

### `getRolesFuncionalidades` (src/lib/roles.ts) — nuevo

Función server-side async que carga el mapa desde DB:

```typescript
export async function getRolesFuncionalidades(): Promise<Record<string, string[]>>
```

Fallback: si la tabla está vacía, retorna `FUNCIONALIDADES_POR_ROL`.

### Visibilidad de solicitudes

Actualmente hardcodeado en `GET /api/solicitudes`. Se reemplaza por consulta a `Rol.verTodasSolicitudes`:

```typescript
const roles = await prisma.rol.findMany({ where: { slug: { in: userRoles } } });
const puedeVerTodo = roles.some(r => r.verTodasSolicitudes);
```

---

## API

Todas las rutas requieren sesión ADMIN.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/config/roles` | Lista todos los roles |
| `POST` | `/api/config/roles` | Crea un rol nuevo (`protegido: false`) |
| `PUT` | `/api/config/roles/[slug]` | Edita nombre, descripción, funcionalidades, verTodasSolicitudes |
| `DELETE` | `/api/config/roles/[slug]` | Elimina si `protegido: false` |

Reglas:
- No se puede eliminar un rol `protegido: true`.
- No se puede crear un rol con un slug que ya exista.
- El slug se normaliza a `UPPER_SNAKE_CASE` automáticamente al crear.

---

## UI: `/configuracion/roles`

- Lista de roles en tabla: nombre, descripción, funcionalidades asignadas (badges), flag "Ver todas" y "Sistema" (protegido).
- Botón **Nuevo Rol** → modal: nombre, descripción, checkboxes de funcionalidades, toggle "Ver todas las solicitudes".
- Click en fila → panel lateral o modal de edición con los mismos campos.
- Roles protegidos: se pueden editar pero el botón eliminar está oculto/deshabilitado con tooltip.
- Card nueva en `/configuracion/page.tsx` con ícono `Shield`.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | Agregar modelo `Rol` |
| `prisma/seed.ts` | Seedear todos los roles existentes + GERENCIA |
| `src/lib/roles.ts` | Nuevo: `FUNCIONALIDADES_DISPONIBLES`, `getRolesFuncionalidades()` |
| `src/lib/utils.ts` | `tienePermiso` con 4º param opcional; agregar GERENCIA a `ROL_LABELS` y `FUNCIONALIDADES_POR_ROL` |
| `src/app/api/config/roles/route.ts` | Nuevo: GET + POST |
| `src/app/api/config/roles/[slug]/route.ts` | Nuevo: PUT + DELETE |
| `src/app/api/solicitudes/route.ts` | Visibilidad por `verTodasSolicitudes` de DB |
| `src/app/api/solicitudes/[id]/estado/route.ts` | Usar `getRolesFuncionalidades()` para `tienePermiso` |
| `src/app/(app)/configuracion/roles/page.tsx` | Nuevo: UI del módulo |
| `src/app/(app)/configuracion/page.tsx` | Agregar card de Roles |

---

## Compatibilidad hacia atrás

- `User.roles` sigue siendo `JSON.stringify(string[])` — no cambia la tabla `User`.
- Los slugs de roles existentes no cambian — todo el código que los compara con strings sigue funcionando.
- `tienePermiso` con 3 argumentos sigue funcionando (4º param es opcional).
- Si DB no tiene datos de roles, `getRolesFuncionalidades()` retorna el mapa hardcodeado como fallback.
