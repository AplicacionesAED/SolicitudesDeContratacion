const { z } = require('zod');

const createSchema = z.object({
  razonSocial: z.string().min(1),
  nit: z.string().min(1),
  tipoContrato: z.string().min(1),
  confidencialidad: z.boolean().optional(),
  representanteLegal: z.string().optional(),
  cedulaRepresentante: z.string().optional(),
  correoFirma: z.string().email().optional(),
  direccionRepresentante: z.string().optional(),
  telefonoRepresentante: z.string().optional(),
  nombreContacto: z.string().optional(),
  telefonoContacto: z.string().optional(),
  correoContacto: z.string().email().optional().or(z.literal('')),
  especialidadIds: z.array(z.number().int()).optional(),
});

// Todo opcional -- el PATCH original acepta cualquier subconjunto de campos
// (contacto vs. resto, ver la nota de permisos en tercero.routes.js).
const updateSchema = z.object({
  nit: z.string().optional(),
  tipoContrato: z.string().optional(),
  confidencialidad: z.boolean().optional(),
  representanteLegal: z.string().optional(),
  cedulaRepresentante: z.string().optional(),
  correoFirma: z.string().email().optional(),
  direccionRepresentante: z.string().optional(),
  telefonoRepresentante: z.string().optional(),
  nombreContacto: z.string().nullable().optional(),
  telefonoContacto: z.string().nullable().optional(),
  correoContacto: z.string().nullable().optional(),
  fechaVencimientoSagrilaft: z.string().nullable().optional(),
  dd_identificacionContraparte: z.boolean().optional(),
  dd_consultaListasRestrictivas: z.boolean().optional(),
  dd_verificacionPep: z.boolean().optional(),
  dd_conocimientoNegocio: z.boolean().optional(),
  dd_monitoreoActualizacion: z.boolean().optional(),
  dd_senalesAlertaReporte: z.boolean().optional(),
  especialidadIds: z.array(z.number().int()).optional(),
});

// Campos de contacto: cualquier usuario autenticado puede editarlos sin el
// permiso 'editar_terceros' -- ver la nota en tercero.routes.js.
const CONTACT_FIELDS = new Set([
  'nit',
  'representanteLegal',
  'cedulaRepresentante',
  'correoFirma',
  'direccionRepresentante',
  'telefonoRepresentante',
  'nombreContacto',
  'telefonoContacto',
  'correoContacto',
  'especialidadIds',
]);

module.exports = { createSchema, updateSchema, CONTACT_FIELDS };
