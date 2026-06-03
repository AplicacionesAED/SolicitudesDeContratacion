# Tercero–Especialidades: Asignación — Diseño

**Fecha:** 2026-06-03
**Módulo:** Terceros
**Alcance:** Relación many-to-many entre Tercero y Especialidad; edición desde el panel de detalle, formulario de creación y visualización en el select de solicitudes.

---

## Contexto

Ya existe el catálogo `Especialidad` (nombre + descripción). Ahora se necesita que cada `Tercero` pueda tener cero o más especialidades asignadas, y que esa asignación sea editable por cualquier usuario autenticado tanto en el panel de detalle del tercero como al crear uno nuevo. Además, el select de terceros en `solicitudForm.tsx` debe mostrar las especialidades del tercero debajo de su nombre.

---

## Modelo de datos

Many-to-many implícito de Prisma — sin campos extra en la relación:

```prisma
model Tercero {
  // ... campos existentes ...
  especialidades Especialidad[] @relation("TerceroEspecialidades")
}

model Especialidad {
  // ... campos existentes ...
  terceros Tercero[] @relation("TerceroEspecialidades")
}
```

Prisma genera la tabla `_TerceroEspecialidades(A: especialidadId, B: terceroId)` automáticamente con `db:push`. Ninguna migración manual requerida.

---

## API

### `GET /api/terceros`
Agregar `include: { especialidades: { select: { id: true, nombre: true } } }` al `findMany`. El select de solicitudes necesita los datos para mostrar las especialidades en el dropdown.

### `GET /api/terceros/[id]`
Agregar `include: { especialidades: { select: { id: true, nombre: true } }, _count: { select: { solicitudes: true } } }` al `findUnique`.

### `PATCH /api/terceros/[id]`
Aceptar campo opcional `especialidadIds: number[]`. Cuando se recibe:
- Aplicar `especialidades: { set: especialidadIds.map((id) => ({ id })) }` en `prisma.tercero.update`.
- Cualquier usuario autenticado puede enviar este campo (consistente con la política de campos de contacto).
- Si `especialidadIds` no viene en el body, no se toca la relación (patch parcial).

---

## UI

### Panel de detalle `src/app/(app)/terceros/[id]/page.tsx`

Agregar una tarjeta "**Especialidades**" al final del layout (debajo del bloque de Contacto Comercial).

**Modo vista:**
- Muestra las especialidades actuales como chips (badge gris con el nombre).
- Si no hay ninguna: texto gris `Sin especialidades asignadas`.
- Botón "Editar" (cualquier usuario autenticado) que activa el modo edición.

**Modo edición (inline, no modal):**
- Carga las especialidades del catálogo desde `GET /api/especialidades`.
- Checkboxes para cada especialidad del catálogo; los ya asignados aparecen marcados.
- Si el catálogo está vacío: mensaje "No hay especialidades en el catálogo. Créalas primero desde Terceros → Especialidades."
- Botones "Cancelar" y "Guardar" — Guardar hace `PATCH /api/terceros/[id]` con `{ especialidadIds: [...] }`.

**Permisos:** cualquier usuario autenticado puede editar (consistente con la edición de campos de contacto).

---

### Formulario de creación `src/app/(app)/terceros/nuevo/page.tsx`

Agregar sección "**Especialidades**" al final del formulario, antes del botón de submit.

- Carga las especialidades del catálogo desde `GET /api/especialidades` al montar.
- Checkboxes para cada especialidad (selección múltiple, opcional).
- Si el catálogo está vacío: el bloque no se renderiza.
- Al enviar, incluye `especialidadIds: number[]` en el body del `POST /api/terceros`.

**Cambio en `POST /api/terceros`:** Aceptar `especialidadIds?: number[]` y, si viene, conectar la relación en `create`:
```ts
especialidades: especialidadIds?.length
  ? { connect: especialidadIds.map((id) => ({ id })) }
  : undefined
```

---

### Select de terceros en `src/features/solicitudes/components/solicitudForm.tsx`

**Cambio en la interfaz `Tercero`:** Agregar `especialidades?: { id: number; nombre: string }[]`.

**En el dropdown (lista de opciones):** Debajo de `razonSocial`, si el tercero tiene especialidades, mostrar una línea adicional con los nombres separados por `·` en texto `text-xs text-gray-400`:

```
EMPRESA ABC S.A.S
  · Ingeniería Civil  · Topografía  · Diseño Estructural
```

**En el item seleccionado (campo cerrado):** Igual — debajo del nombre truncado, mostrar las especialidades en `text-xs text-gray-400` sin truncar con `...` (se permite que se corten visualmente).

Si el tercero no tiene especialidades, la segunda línea no se renderiza.

---

## Archivos a crear/modificar

| Archivo | Operación |
|---------|-----------|
| `prisma/schema.prisma` | Modificar — agregar relación many-to-many en `Tercero` y `Especialidad` |
| `src/app/api/terceros/route.ts` | Modificar — incluir `especialidades` en GET |
| `src/app/api/terceros/[id]/route.ts` | Modificar — incluir `especialidades` en GET; manejar `especialidadIds` en PATCH |
| `src/app/api/terceros/route.ts` (POST) | Modificar — aceptar `especialidadIds` al crear |
| `src/app/(app)/terceros/[id]/page.tsx` | Modificar — agregar tarjeta Especialidades con modo vista/edición |
| `src/app/(app)/terceros/nuevo/page.tsx` | Modificar — agregar sección Especialidades con checkboxes |
| `src/features/solicitudes/components/solicitudForm.tsx` | Modificar — mostrar especialidades en dropdown y item seleccionado |

---

## Reglas de negocio

- La relación es opcional: un tercero puede tener 0 especialidades.
- Un `PATCH` con `especialidadIds: []` desasigna todas las especialidades.
- Un `PATCH` sin `especialidadIds` no toca la relación (preserva estado actual).
- El catálogo vacío no bloquea la creación/edición de terceros — simplemente no se muestra el selector.
- Eliminar una `Especialidad` del catálogo desasigna automáticamente a todos los terceros que la tenían (cascade de la relación implícita de Prisma).
