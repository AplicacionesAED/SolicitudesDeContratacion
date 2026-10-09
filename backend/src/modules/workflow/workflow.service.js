// CRUD admin de desvíos condicionales -- el "permiso requerido" por acción
// (WorkflowPaso, listPasos/updatePaso/getPermisosBase) se eliminó el
// 2026-09-02 ("eliminar permisos de rol para solicitudes"): ya ninguna
// acción de aprobación se gatea por un permiso de rol, se resuelve 100%
// contra AprobadorFrente (ver solicitud.autorizacion.js). Los desvíos
// condicionales son independientes de eso -- deciden A DÓNDE va la
// solicitud, no QUIÉN puede moverla -- y se quedan tal cual.
const ApiError = require('../../utils/ApiError');
const WorkflowDesvio = require('./workflowDesvio.model');
const WorkflowLayout = require('./workflowLayout.model');

// Fallback -- mismo desvío que existía hardcodeado antes de este módulo
// (ENVIAR + rol TECNICA + categoría INDIRECTA -> PENDIENTE_DIRECTOR_TECNICO).
const FALLBACK_DESVIOS = [{ accion: 'ENVIAR', condicion_rol: 'TECNICA', condicion_categoria: 'INDIRECTA', estado_destino: 'PENDIENTE_DIRECTOR_TECNICO', activo: true }];

async function listDesvios(accion) {
  return WorkflowDesvio.findAll({ where: accion ? { accion } : undefined, order: [['id', 'ASC']] });
}

async function createDesvio(data) {
  return WorkflowDesvio.create(data);
}

async function updateDesvio(id, data) {
  const desvio = await WorkflowDesvio.findByPk(id);
  if (!desvio) throw new ApiError(404, 'Desvío no encontrado');
  await desvio.update(data);
  return desvio;
}

async function removeDesvio(id) {
  const desvio = await WorkflowDesvio.findByPk(id);
  if (!desvio) throw new ApiError(404, 'Desvío no encontrado');
  await desvio.destroy();
}

// ── Runtime (consumido por solicitud.estado.js) ─────────────────────────────

async function getDesviosActivos(accion) {
  try {
    const desvios = await WorkflowDesvio.findAll({ where: { accion, activo: true }, order: [['id', 'ASC']] });
    return desvios;
  } catch {
    return FALLBACK_DESVIOS.filter((d) => d.accion === accion && d.activo);
  }
}

// ── Layout del canvas (2026-09-02, "dame acceso a modificar las líneas") ───

// Sin fila todavía = null -- el frontend usa sus posiciones default
// (NODOS_DEF) en ese caso, no hace falta sembrar nada acá.
async function getLayout(categoria) {
  const layout = await WorkflowLayout.findOne({ where: { categoria } });
  return layout ? layout.posiciones : null;
}

async function saveLayout(categoria, posiciones) {
  const [layout] = await WorkflowLayout.findOrCreate({ where: { categoria }, defaults: { categoria, posiciones } });
  await layout.update({ posiciones });
  return layout.posiciones;
}

module.exports = { listDesvios, createDesvio, updateDesvio, removeDesvio, getDesviosActivos, getLayout, saveLayout };
