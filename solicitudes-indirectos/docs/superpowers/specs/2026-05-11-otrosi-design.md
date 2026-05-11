# Diseño: Módulo de Otrosís

**Fecha:** 2026-05-11
**Estado:** Aprobado

---

## Resumen

Se implementan dos nuevos tipos de solicitud — `OTROSI_TIEMPO` y `OTROSI_TIEMPO_CANTIDAD` — como solicitudes hijas de una solicitud completada. Cada otrosí pasa por el mismo flujo de aprobación completo que una solicitud normal. Una solicitud puede tener múltiples otrosís.

---

## 1. Base de datos

### Cambio en `Solicitud`

Se agrega un campo auto-referencial nullable:

```prisma
model Solicitud {
  // ...campos existentes...
  solicitudPadreId Int?
  solicitudPadre   Solicitud?  @relation("OtrosiPadre", fields: [solicitudPadreId], references: [id])
  otrosis          Solicitud[] @relation("OtrosiPadre")
}
```

- `solicitudPadreId = null` → solicitud normal.
- `solicitudPadreId = N` → es un otrosí del contrato N.
- No hay límite de otrosís por solicitud padre.
- El cronograma del otrosí vive en su propio `CronogramaContrato`; el cronograma original de la solicitud padre queda intacto.

---

## 2. Permisos

Se agrega el slug `crear_otrosi` al sistema de permisos:

- Se incluye por defecto en el rol `SOLICITANTE` dentro de `FUNCIONALIDADES_POR_ROL` en `src/lib/utils.ts`.
- Los `ADMIN` lo tienen implícito por `acceso_total`.
- Aparece como checkbox en Configuración → Usuarios (pantalla de edición de usuario), igual que el resto de funcionalidades adicionales.

---

## 3. Formulario (rutas ya declaradas como "Próximamente")

**Rutas:**
- `/solicitudes/nueva/otrosi-tiempo` → `OTROSI_TIEMPO`
- `/solicitudes/nueva/otrosi-tiempo-cantidad` → `OTROSI_TIEMPO_CANTIDAD`

Ambas rutas se activan (se elimina la marca "Próximamente") en `nueva/page.tsx`.

**Flujo del formulario:**

**Paso 1 — Selección de solicitud padre**
- Select/buscador que lista solicitudes en estado `COMPLETADA` visibles para el usuario.
- Muestra: consecutivo, tercero (razonSocial), valorFinal.
- Al seleccionar, el formulario muestra el cronograma vigente de esa solicitud como referencia (solo lectura).

**Paso 2 — Nuevo cronograma**
- `CronogramaBuilder` existente, vacío.
- Mismas validaciones: fecha de inicio mínimo 13 días hábiles desde hoy.

**Paso 2b — Solo `OTROSI_TIEMPO_CANTIDAD`**
- Campo adicional: "Nuevo valor del contrato" (`valorFinal` del otrosí).
- Al completarse el otrosí (estado `COMPLETADA`), el state machine actualiza el `valorFinal` de la solicitud padre con este valor.

**Submit:**
- Crea `Solicitud` con `tipo = OTROSI_TIEMPO | OTROSI_TIEMPO_CANTIDAD`, `solicitudPadreId = id_padre`, `estado = BORRADOR`.
- Proyecto y frentes se heredan automáticamente de la solicitud padre.
- Consecutivo generado con el mecanismo transaccional existente (`ContadorConsecutivo`).

---

## 4. Efecto al completar un otrosí

En `src/app/api/solicitudes/[id]/estado/route.ts`, cuando la acción `APROBAR_FINAL` lleva el otrosí a `COMPLETADA`:

- Si `tipo = OTROSI_TIEMPO_CANTIDAD`: actualizar `valorFinal` y `valorEnLetras` de la solicitud padre (`solicitudPadreId`).
- Para ambos tipos: no se toca el cronograma de la solicitud padre; el nuevo cronograma vive en el otrosí.

---

## 5. Lista de solicitudes (`/solicitudes`)

- `GET /api/solicitudes` incluye `_count: { otrosis: true }` y devuelve `otrosiCount` por fila.
- En la tabla, filas con `otrosiCount > 0` muestran un indicador clickeable en la columna "Tipo": ícono + "N otrosís".
- Al hacer clic, la fila se expande mostrando una sub-tabla con los otrosís hijos: consecutivo, tipo, estado, fecha. Cada fila hijo es clickeable y lleva a su detalle.
- Filas sin otrosís no cambian.

---

## 6. Detalle de solicitud (`/solicitudes/[id]`)

**Vista desde la solicitud padre:**

La consulta del detalle incluye `otrosis` con sus `cronograma` (fases y actividades) para construir la sección de historial.

Sección "Cronogramas" al final de la página (antes del historial de estados). Muestra en orden cronológico:

- Tarjeta "Original" → cronograma de la solicitud padre.
- Tarjeta "Otrosí N — [consecutivo]" por cada otrosí completado, en orden de `creadoEn`.
- La tarjeta más reciente lleva la etiqueta "Vigente" y borde azul destacado.
- Otrosís en estados intermedios (no `COMPLETADA`) aparecen con etiqueta "En trámite" y estilo neutro/gris, sin borde destacado.

**Vista desde el otrosí:**

Banner en la parte superior: "Este otrosí corresponde a [consecutivo padre]" con link al detalle de la solicitud padre.

---

## 7. Archivos afectados

| Área | Archivo |
|---|---|
| Schema | `prisma/schema.prisma` |
| Permisos | `src/lib/utils.ts` |
| API list | `src/app/api/solicitudes/route.ts` |
| API estado | `src/app/api/solicitudes/[id]/estado/route.ts` |
| API detail | `src/app/api/solicitudes/[id]/route.ts` |
| Lista UI | `src/app/(app)/solicitudes/page.tsx` |
| Detalle UI | `src/app/(app)/solicitudes/[id]/page.tsx` |
| Form otrosí tiempo | `src/app/(app)/solicitudes/nueva/otrosi-tiempo/page.tsx` (nuevo) |
| Form otrosí t+c | `src/app/(app)/solicitudes/nueva/otrosi-tiempo-cantidad/page.tsx` (nuevo) |
| Tipo selector | `src/app/(app)/solicitudes/nueva/page.tsx` |
| Migración DB | `prisma/migrations/...` |
