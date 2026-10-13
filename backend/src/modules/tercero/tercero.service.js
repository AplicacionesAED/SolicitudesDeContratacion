// API en camelCase (mismo vocabulario que la app Next.js original, útil para
// la Fase 9 al comparar/migrar datos reales) sobre columnas snake_case en la
// BD -- este archivo es el único que traduce entre los dos.
const { QueryTypes } = require('sequelize');
const ApiError = require('../../utils/ApiError');
const sequelize = require('../../config/db');
const Tercero = require('./tercero.model');
const Especialidad = require('../especialidad/especialidad.model');

const CAMPO_DB = {
  razonSocial: 'razon_social',
  nit: 'nit',
  tipoContrato: 'tipo_contrato',
  confidencialidad: 'confidencialidad',
  representanteLegal: 'representante_legal',
  cedulaRepresentante: 'cedula_representante',
  correoFirma: 'correo_firma',
  direccionRepresentante: 'direccion_representante',
  telefonoRepresentante: 'telefono_representante',
  nombreContacto: 'nombre_contacto',
  telefonoContacto: 'telefono_contacto',
  correoContacto: 'correo_contacto',
  fechaVencimientoSagrilaft: 'fecha_vencimiento_sagrilaft',
  dd_identificacionContraparte: 'dd_identificacion_contraparte',
  dd_consultaListasRestrictivas: 'dd_consulta_listas_restrictivas',
  dd_verificacionPep: 'dd_verificacion_pep',
  dd_conocimientoNegocio: 'dd_conocimiento_negocio',
  dd_monitoreoActualizacion: 'dd_monitoreo_actualizacion',
  dd_senalesAlertaReporte: 'dd_senales_alerta_reporte',
};

function aCamposDb(body) {
  const values = {};
  for (const [campoApi, campoDb] of Object.entries(CAMPO_DB)) {
    if (body[campoApi] !== undefined) values[campoDb] = body[campoApi];
  }
  return values;
}

// Los 6 checks de debida diligencia y los datos que el documento de la solicitud necesita del tercero.
const DD_CAMPOS = ['dd_identificacionContraparte', 'dd_consultaListasRestrictivas', 'dd_verificacionPep', 'dd_conocimientoNegocio', 'dd_monitoreoActualizacion', 'dd_senalesAlertaReporte'];
const DATOS_REQUERIDOS = ['nit', 'representanteLegal', 'cedulaRepresentante', 'correoFirma', 'direccionRepresentante', 'telefonoRepresentante'];

function _enrich(tercero) {
  const t = tercero.toJSON();
  return {
    id: t.id,
    razonSocial: t.razon_social,
    nit: t.nit,
    tipoContrato: t.tipo_contrato,
    confidencialidad: t.confidencialidad,
    representanteLegal: t.representante_legal,
    cedulaRepresentante: t.cedula_representante,
    correoFirma: t.correo_firma,
    direccionRepresentante: t.direccion_representante,
    telefonoRepresentante: t.telefono_representante,
    nombreContacto: t.nombre_contacto,
    telefonoContacto: t.telefono_contacto,
    correoContacto: t.correo_contacto,
    fechaVencimientoSagrilaft: t.fecha_vencimiento_sagrilaft,
    dd_identificacionContraparte: t.dd_identificacion_contraparte,
    dd_consultaListasRestrictivas: t.dd_consulta_listas_restrictivas,
    dd_verificacionPep: t.dd_verificacion_pep,
    dd_conocimientoNegocio: t.dd_conocimiento_negocio,
    dd_monitoreoActualizacion: t.dd_monitoreo_actualizacion,
    dd_senalesAlertaReporte: t.dd_senales_alerta_reporte,
    aprobadoDebidaDiligencia: t.aprobado_debida_diligencia,
    creadoEn: t.creado_en,
    actualizadoEn: t.actualizado_en,
    especialidades: (t.especialidades ?? []).map((e) => ({ id: e.id, nombre: e.nombre })),
  };
}

async function list({ aprobado } = {}) {
  const where = aprobado === 'true' ? { aprobado_debida_diligencia: true } : aprobado === 'false' ? { aprobado_debida_diligencia: false } : {};
  const terceros = await Tercero.findAll({
    where,
    order: [['razon_social', 'ASC']],
    include: [{ model: Especialidad, as: 'especialidades', attributes: ['id', 'nombre'], through: { attributes: [] } }],
  });
  // Resumen por tercero para el Directorio (rediseno 2026-10-09): cuanto se ha contratado con el, cuantos checks de
  // debida diligencia lleva y que datos de contacto le faltan. Un solo GROUP BY para todos, no una consulta por fila.
  const resumen = await sequelize.query(
    `SELECT tercero_id, COUNT(*)::int AS total, COALESCE(SUM(valor_final), 0)::float AS valor, MAX(fecha_solicitud) AS ultima
       FROM solicitudes
      WHERE tercero_id IS NOT NULL AND solicitud_padre_id IS NULL AND estado NOT IN ('ANULADA', 'BORRADOR')
      GROUP BY tercero_id`,
    { type: QueryTypes.SELECT }
  );
  const porTercero = new Map(resumen.map((r) => [r.tercero_id, r]));
  return terceros.map((t) => {
    const e = _enrich(t);
    const r = porTercero.get(e.id);
    e.totalSolicitudes = r?.total ?? 0;
    e.valorContratado = r?.valor ?? 0;
    e.ultimaSolicitud = r?.ultima ?? null;
    e.ddCompletados = DD_CAMPOS.filter((c) => e[c]).length;
    e.datosFaltantes = DATOS_REQUERIDOS.filter((c) => !e[c] || !String(e[c]).trim());
    return e;
  });
}

async function getById(id) {
  const tercero = await Tercero.findByPk(id, {
    include: [{ model: Especialidad, as: 'especialidades', attributes: ['id', 'nombre'], through: { attributes: [] } }],
  });
  if (!tercero) throw new ApiError(404, 'Tercero no encontrado');
  // El conteo de solicitudes asociadas (para bloquear el delete) se agrega
  // en la Fase 4, cuando exista el modulo `solicitud` -- hasta entonces
  // remove() no tiene esa proteccion (ver comentario ahi).
  return _enrich(tercero);
}

async function create(body) {
  const razonSocial = body.razonSocial.trim();
  const nit = body.nit.trim();

  const existentePorNit = await Tercero.findOne({ where: { nit } });
  if (existentePorNit) throw new ApiError(409, 'Ya existe un tercero con ese NIT');

  const existentePorRazon = await Tercero.findOne({ where: { razon_social: razonSocial } });
  if (existentePorRazon) throw new ApiError(409, 'Ya existe un tercero con esa razón social');

  const tercero = await sequelize.transaction(async (transaction) => {
    const nuevo = await Tercero.create({ ...aCamposDb(body), razon_social: razonSocial, nit }, { transaction });
    if (Array.isArray(body.especialidadIds) && body.especialidadIds.length > 0) {
      await nuevo.setEspecialidades(body.especialidadIds, { transaction });
    }
    return nuevo;
  });

  return getById(tercero.id);
}

async function update(id, body) {
  const tercero = await Tercero.findByPk(id);
  if (!tercero) throw new ApiError(404, 'Tercero no encontrado');

  if (body.nit && body.nit.trim() !== tercero.nit) {
    const dup = await Tercero.findOne({ where: { nit: body.nit.trim() } });
    if (dup) throw new ApiError(409, 'Ya existe un tercero con ese NIT');
  }

  const values = aCamposDb(body);

  // Auto-deriva aprobado_debida_diligencia SOLO cuando se están actualizando
  // campos de DD -- mismo criterio que el PATCH original: los 6 checks tienen
  // que estar todos en true para que quede aprobado. Este es un camino
  // DISTINTO del que usa el sync de SharePoint (que setea
  // aprobado_debida_diligencia directo desde la columna "DD" del Excel, sin
  // pasar por estos 6 booleanos) -- los dos caminos coexisten a propósito,
  // igual que en la app original.
  const tocaCamposDd = Tercero.DD_FIELDS.some((f) => f in values);
  if (tocaCamposDd) {
    const combinados = {};
    for (const campo of Tercero.DD_FIELDS) {
      combinados[campo] = campo in values ? Boolean(values[campo]) : tercero[campo];
    }
    values.aprobado_debida_diligencia = Tercero.DD_FIELDS.every((f) => combinados[f]);
  }

  await sequelize.transaction(async (transaction) => {
    if (Object.keys(values).length > 0) await tercero.update(values, { transaction });
    if (Array.isArray(body.especialidadIds)) await tercero.setEspecialidades(body.especialidadIds, { transaction });
  });

  return getById(id);
}

async function remove(id) {
  const tercero = await Tercero.findByPk(id);
  if (!tercero) throw new ApiError(404, 'Tercero no encontrado');
  // TODO Fase 4: bloquear si tiene Solicitudes asociadas (ver getById).
  await tercero.destroy();
}

module.exports = { list, getById, create, update, remove, CAMPO_DB };
