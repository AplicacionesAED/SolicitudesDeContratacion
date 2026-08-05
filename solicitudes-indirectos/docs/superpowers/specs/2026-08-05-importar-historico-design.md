# Importar contrato/otrosí histórico — Diseño

## Contexto y problema

Antes de este sistema ya existían contratos (y otrosís sobre esos contratos) gestionados en papel/Excel. Hoy no hay forma de crear un otrosí "real" sobre uno de esos contratos porque el flujo de Otrosí (`OtrosiForm`) solo permite elegir como contrato base una `Solicitud` que ya existe en la base de datos con `estado = COMPLETADA`.

Se confirmó además (ver `2026-05-11-otrosi-design.md`) que las Órdenes de Servicio nunca admiten otrosí — esa exclusión en `otrosiForm.tsx` es intencional y no cambia con este diseño.

Necesidad: poder registrar en el sistema, de forma recurrente (no un caso único), contratos y/o otrosís anteriores al sistema, hechos por el mismo solicitante, sin pasar por el flujo de aprobación completo — pero preservando la numeración real de otrosís que ya llevaban en papel (ej. "este es el otrosí número 4").

## Alcance

- Importar un **contrato/trámite original** que no existe en el sistema.
- Importar un **otrosí histórico** de un contrato que **ya existe** en el sistema (nativo o previamente importado), indicando explícitamente qué número de otrosí es.
- Los registros importados quedan `estado = COMPLETADA` de inmediato, marcados como históricos, y funcionan como base para crear otrosís nuevos y reales a través del flujo normal.

Fuera de alcance:
- Carga de documentos/anexos durante la importación.
- Nota libre adicional (se genera una nota automática).
- Consecutivo manual (se genera igual que cualquier solicitud nueva).
- Cualquier cambio a la máquina de estados o a las reglas de aprobación existentes.

## Punto de entrada

No es un tile nuevo en `/solicitudes/nueva`. Se agrega un enlace dentro del **Paso 1 de `OtrosiForm`** (donde hoy se busca el contrato base), del tipo:

> "¿El contrato o el otrosí que necesitas es anterior a este sistema? Impórtalo aquí →"

que lleva a una página nueva `/solicitudes/importar-historico` con un componente `ImportarHistoricoForm` (mismo patrón de carpeta que `otrosiForm.tsx`, en `src/features/solicitudes/components/`).

## Permisos

Reutiliza el permiso existente `crear_enviar_solicitudes` — no se crea un slug de funcionalidad nuevo. Cualquier usuario que hoy puede crear y enviar solicitudes puede importar históricos.

## Flujo del formulario (`ImportarHistoricoForm`)

Primer paso: elegir qué se está importando.

### Modo A — Contrato/trámite original

Campos:
- `tipo`: dropdown limitado a los tipos que admiten otrosí (`CONTRATO`, `TRAMITE_CUENTA`, `TRAMITE_FACTURAS`, `TRAMITE_CUENTAS_RECURRENTES`, `TRAMITE_CUENTAS_OCASIONALES`, `TRAMITE_BONIFICACIONES_COMISIONES`) — excluye `ORDEN_SERVICIO` y los dos tipos de Otrosí.
- Tercero (mismo selector que el resto de la app, filtrado a `aprobadoDebidaDiligencia = true`).
- Proyecto y frente(s).
- Valor final.
- Fecha de inicio y fecha de fin del contrato (se guardan en un `CronogramaContrato` simple, sin fases).

### Modo B — Otrosí histórico de un contrato existente

Campos:
- Selector de contrato padre: búsqueda entre solicitudes con `estado = COMPLETADA` y tipo elegible (nativas o ya importadas — sin distinción).
- `numeroOtrosi`: entero positivo, obligatorio (ej. `4`). No se valida contra otros otrosís ya registrados del mismo padre (ni unicidad ni orden) — es información histórica que el usuario declara directamente; se confía en que la conoce. Esto es distinto del cálculo automático `MAX + 1` que sí aplica a los otrosís reales creados después (ver más abajo).
- `tipo`: `OTROSI_TIEMPO` u `OTROSI_TIEMPO_CANTIDAD`.
- Valor final nuevo (solo si `OTROSI_TIEMPO_CANTIDAD`; si no se indica, se hereda el valor vigente del padre/último otrosí, igual que en la creación normal).
- Fecha de inicio y fecha de fin (nuevo `CronogramaContrato` para este otrosí).

Validaciones reutilizadas de la creación normal de otrosí: el padre debe existir y estar `COMPLETADA`, y no debe existir ya un otrosí **activo** (no completado) para ese padre.

**Validación que NO se reutiliza:** el chequeo de "el contrato ya venció" (`fechaFin` en el pasado) se omite en la importación — es exactamente lo esperado poder registrar un otrosí histórico cuya vigencia ya pasó. Si alguien intenta crear un otrosí nuevo *real* después, contra un padre/baseline con `fechaFin` vencida, ese chequeo sí se sigue aplicando normalmente (sin cambios ahí).

## Cambios de datos (`schema.prisma`, modelo `Solicitud`)

```prisma
importadoHistorico Boolean @default(false)
numeroOtrosi        Int?
```

`numeroOtrosi` aplica solo a solicitudes de tipo `OTROSI_TIEMPO`/`OTROSI_TIEMPO_CANTIDAD` (importadas o nativas — ver siguiente sección).

## Numeración continua de otrosís (para nativos y para importados)

Para que la numeración no se rompa cuando se mezclan otrosís históricos con otrosís reales creados después, `numeroOtrosi` se calcula automáticamente también en la creación **normal** de otrosí (rama existente `solicitudPadreId` en `POST /api/solicitudes`):

```
numeroOtrosi = MAX(numeroOtrosi de todos los hijos existentes del padre, o 0) + 1
```

Así, si el otrosí histórico más reciente importado quedó marcado como "número 4", el siguiente otrosí real creado por la app ya sale automáticamente como "número 5", sin que nadie tenga que llevar la cuenta a mano.

## Endpoint nuevo

`POST /api/solicitudes/importar-historico` — separado del `POST /api/solicitudes` general (que ya mezcla la creación normal con la rama de otrosí; meter un tercer modo ahí lo haría demasiado denso). Recibe un campo `modo: "CONTRATO" | "OTROSI"` que determina cuál de los dos conjuntos de campos anteriores espera.

En una transacción:
1. Genera el consecutivo con la misma lógica que ya existe (ver refactor abajo).
2. Crea la `Solicitud` con `estado: "COMPLETADA"`, `importadoHistorico: true`, y (modo OTROSI) `solicitudPadreId` + `numeroOtrosi`.
3. Crea el `CronogramaContrato` asociado.
4. Crea una `HistorialSolicitud` con `accion: "IMPORTAR_HISTORICO"` y nota automática: `"Contrato histórico importado por {nombre del usuario}"` (o "Otrosí histórico..." en modo OTROSI).

### Refactor incluido: extraer la generación de consecutivo

Hoy el bloque de `proyAbbr`/`frenAbbr`/`ContadorConsecutivo.upsert`/`buildConsecutivo` está duplicado entre la creación normal y la rama de otrosí en `src/app/api/solicitudes/route.ts`. Se extrae a una función compartida (ej. `generarConsecutivo(tx, { tipo, proyectoId, frentesIds })` en `src/lib/utils.ts` o un nuevo `src/lib/consecutivo.ts`), usada por los tres puntos: creación normal, otrosí, e importación histórica. Evita una tercera copia del mismo bloque.

## Cambios de UI existentes

- **Labels de historial** (`src/lib/utils.ts`): agregar `IMPORTAR_HISTORICO` a `ACCION_LABELS` (ej. "Contrato histórico importado" / diferenciado si es otrosí), `ACCION_COLOR`, y `ACCION_ESTADO_DESTINO: "COMPLETADA"` — así la entrada en el historial de la solicitud se ve igual de bien que cualquier otra, sin caer al fallback de texto crudo.
- **Badge**: en la lista de solicitudes y en el detalle, si `importadoHistorico`, mostrar una etiqueta "Importado" (y si `numeroOtrosi` está presente, "Otrosí histórico #N").
- **`EstadoTimeline`**: cuando `importadoHistorico` es `true`, no se renderiza el stepper normal (mostraría casi todos los pasos como pendientes pese a estar completado, porque no hay historial de `ENVIAR`/`APROBAR_DIRECTOR`/etc.). Se muestra en su lugar un aviso simple: "Contrato histórico — importado sin flujo de aprobación."

## Testing

- Importar un contrato original → aparece disponible en el Paso 1 de `OtrosiForm` para crear un otrosí real.
- Importar un otrosí histórico sobre un contrato ya existente → se convierte en la línea base vigente (cronograma/valor) la próxima vez que se cree un otrosí real sobre ese mismo padre, y ese otrosí nuevo recibe `numeroOtrosi` = histórico + 1.
- Intentar importar un otrosí histórico sobre un padre con un otrosí activo (no completado) → bloqueado, mismo mensaje que ya existe.
- Intentar importar sobre un padre no `COMPLETADA` → bloqueado.
- Importar con `fechaFin` en el pasado → permitido (a diferencia de la creación normal de otrosí).
- El badge y el aviso de `EstadoTimeline` se ven correctamente tanto para contratos importados como para otrosís históricos importados.
