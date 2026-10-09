const { z } = require('zod');

// Sin validación estricta de "requerido" acá a propósito -- una Solicitud
// arranca en BORRADOR con casi todo opcional (mismo criterio que el POST
// original: solo tipo/proyectoId/frentesIds son obligatorios para crear el
// borrador). Los campos realmente obligatorios para ENVIAR se validan en
// solicitud.estado.js, no acá.
const createSchema = z.object({
  tipo: z.string().min(1),
  // Requerido en ambas ramas de creación -- para un otrosí, el service valida
  // que coincida con la del padre y persiste SIEMPRE la del padre, nunca este
  // valor directo (ver crearOtrosi en solicitud.service.js); se pide igual
  // acá para que el controller pueda resolver el slug de permiso correcto
  // antes de tocar la base de datos.
  categoria: z.enum(['DIRECTA', 'INDIRECTA']),
  proyectoId: z.number().int().optional(), // no se exige si es un otrosí (hereda del padre)
  frentesIds: z.array(z.number().int()).optional(),
  terceroId: z.number().int().nullable().optional(),
  descripcionActividad: z.string().nullable().optional(),
  plazoEjecucion: z.string().nullable().optional(),
  formaPago: z.string().nullable().optional(),
  valorFinal: z.number().nullable().optional(),
  tipoContrato: z.string().nullable().optional(),
  asunto: z.string().nullable().optional(),
  creacionTercero: z.boolean().optional(),
  alcance: z.string().nullable().optional(),
  terminosReferencia: z.string().nullable().optional(),
  condicionesEspeciales: z.string().nullable().optional(),
  valorEnLetras: z.string().nullable().optional(),
  contratanteNombre: z.string().nullable().optional(),
  contratanteNit: z.string().nullable().optional(),
  archivoCotizacion: z.string().nullable().optional(),
  archivoGeneradorGastos: z.string().nullable().optional(),
  archivoEvaluacionInicial: z.string().nullable().optional(),
  archivoPreBEP: z.string().nullable().optional(),
  solicitudPadreId: z.number().int().optional(),
  // 2026-09-25 "el histórico también se pueda guardar borrador" -- marca la
  // solicitud como registro histórico DESDE que nace en BORRADOR (no solo al
  // completarla), para que "volver a la edición" (EditarSolicitudPage) la
  // reconozca y muestre el mismo formulario/botones de importar (ver
  // SolicitudForm.jsx#esHistorico). No viaja por CAMPO_DB -- se persiste a
  // mano en crearNormal, nunca patcheable después (igual que tipo/categoria).
  importadoHistorico: z.boolean().optional(),
});

// PATCH acepta cualquier subconjunto de los mismos campos, más los booleanos
// de documentos y archivosAnexos -- mismo criterio permisivo que el original
// (strip de campos protegidos, sin schema estricto). El whitelist real de qué
// columna de BD se puede tocar vive en CAMPO_DB (solicitud.service.js), no
// acá: un campo que no está en ese mapa nunca llega a la query aunque pase
// este schema.
const updateSchema = createSchema.partial().extend({
  archivosAnexos: z.array(z.object({ url: z.string(), nombre: z.string() })).optional(),
  docTerminosReferencia: z.boolean().optional(),
  docCamaraComercio: z.boolean().optional(),
  docEstadosFinancieros: z.boolean().optional(),
  docEstadoResultados: z.boolean().optional(),
  docSagrilaft: z.boolean().optional(),
  docComposicionAccionaria: z.boolean().optional(),
  docRut: z.boolean().optional(),
  docCedulaRepresentante: z.boolean().optional(),
  docCertificacionBancaria: z.boolean().optional(),
  docCotizacion: z.boolean().optional(),
  archivoFormatoSolicitud: z.string().nullable().optional(),
});

const estadoSchema = z.object({
  accion: z.string().min(1),
  nota: z.string().optional(),
  estadoContratacion: z.string().optional(),
  numeroContratoAdpro: z.string().optional(),
});

module.exports = { createSchema, updateSchema, estadoSchema };
