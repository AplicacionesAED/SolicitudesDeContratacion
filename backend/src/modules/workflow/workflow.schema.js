const { z } = require('zod');

// Las acciones del motor -- fijas, no editables desde acá (solo se les
// puede agregar/quitar desvíos). El "permiso requerido" por acción se
// eliminó (2026-09-02, "eliminar permisos de rol para solicitudes") -- ver
// solicitud.autorizacion.js, ahora se resuelve contra AprobadorFrente.
// `ANULAR` (2026-09-09) y `APROBAR_PROYECCION` (2026-09-18, flujo propio de
// Directa) faltaban en esta lista -- un desvío sobre cualquiera de las dos
// fallaba la validación de Zod sin que nadie lo hubiera notado (no se había
// intentado crear un desvío para ninguna de las dos hasta ahora). Idem
// `APROBAR_RESIDENTE_ADMINISTRATIVO` (2026-09-21, doble paso del Residente
// Administrativo en Directa) y `COMENTAR` (2026-09-21) -- se agregan de
// entrada para que un desvío sobre cualquiera de ellas no falle la
// validación.
const ACCIONES = [
  'ENVIAR',
  'APROBAR_DIRECTOR_TECNICO',
  'APROBAR_DIRECTOR',
  'APROBAR_PROYECCION',
  'APROBAR_RESIDENTE_ADMINISTRATIVO',
  'COMENTAR',
  'DEVOLVER',
  'REVISAR',
  'TRAMITAR_OK',
  'AVANZAR_CONTRATOS',
  'PASAR_CONTROLES',
  'REGISTRAR_ADPRO',
  'APROBAR_FINAL',
  'APROBAR_GERENTE_COMPRAS',
  'REENVIAR',
  'ANULAR',
];

const ESTADOS = [
  'BORRADOR',
  'PENDIENTE_DIRECTOR_TECNICO',
  'ENVIADA',
  'APROBADA_DIRECTOR',
  'PENDIENTE_RESIDENTE_ADMINISTRATIVO',
  'EN_PROYECCION_CONTROLES',
  'EN_TRAMITE_CONTRATOS',
  'CREACION_MINUTA',
  'ENVIO_CONTRATO_POLIZAS',
  'EN_CONTROLES',
  'APROBACION_FINAL',
  'PENDIENTE_GERENTE_COMPRAS',
  'COMPLETADA',
  'DEVUELTA',
  'EN_REVISION',
  'ANULADA',
];

// `condicion_rol` ya no se valida contra un enum fijo -- ver la nota en
// usuario.schema.js/aprobadorFrente.schema.js (mismo bug, mismo fix).
const desvioSchema = z.object({
  accion: z.enum(ACCIONES),
  condicion_rol: z.string().min(1).nullable().optional(),
  condicion_categoria: z.enum(['DIRECTA', 'INDIRECTA']).nullable().optional(),
  estado_destino: z.enum(ESTADOS),
  activo: z.boolean().optional(),
});

const updateDesvioSchema = desvioSchema.partial();

// Acomodo manual del canvas de WorkflowDiagramaPage.jsx (2026-09-02, "dame
// acceso a modificar las líneas"/"¿puedo mover las líneas también?") -- una
// fila por categoría, compartido entre todos los admins. `nodos`: idEstado
// -> {x,y} (posición de la caja). `aristas`: idArista -> {centerX,centerY}
// (punto de quiebre del `smoothstep` que dibuja la línea, ver
// AccionEdge.jsx -- mover la línea es mover ESE punto, no la línea entera).
// No se valida que las keys sean justo los `ESTADOS`/ids de arista actuales
// (a propósito -- si el diagrama agrega/saca un nodo o arista más adelante,
// esto no debe romper el guardado de un layout viejo con keys que ya no
// existen).
const layoutSchema = z.object({
  categoria: z.enum(['DIRECTA', 'INDIRECTA']),
  posiciones: z.object({
    nodos: z.record(z.string(), z.object({ x: z.number(), y: z.number() })).optional(),
    aristas: z.record(z.string(), z.object({ centerX: z.number().optional(), centerY: z.number().optional() })).optional(),
  }),
});

module.exports = { ACCIONES, ESTADOS, desvioSchema, updateDesvioSchema, layoutSchema };
