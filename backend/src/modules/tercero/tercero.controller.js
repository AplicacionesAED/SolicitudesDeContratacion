const asyncHandler = require('../../utils/asyncHandler');
const { ok, created, noContent } = require('../../utils/ApiResponse');
const { tienePermiso, getRolesFuncionalidades } = require('../../utils/permisos');
const ApiError = require('../../utils/ApiError');
const service = require('./tercero.service');
const { CONTACT_FIELDS } = require('./tercero.schema');

const list = asyncHandler(async (req, res) => ok(res, await service.list({ aprobado: req.query.aprobado })));
const getById = asyncHandler(async (req, res) => ok(res, await service.getById(req.params.id)));

const create = asyncHandler(async (req, res) => {
  const roles = req.usuario.roles ?? [];
  const funcionalidadesAdicionales = req.usuario.funcionalidades_adicionales ?? [];
  const funcionalidadesPorRol = await getRolesFuncionalidades();
  if (!tienePermiso(roles, funcionalidadesAdicionales, 'crear_terceros', funcionalidadesPorRol, req.usuario.esAdmin)) {
    throw new ApiError(403, 'No tiene permiso para crear terceros');
  }
  created(res, await service.create(req.body));
});

// Campos de contacto: cualquier autenticado puede editarlos. Cualquier otro
// campo (DD, SAGRILAFT, tipo de contrato) exige el permiso 'editar_terceros'
// -- ver la nota en tercero.schema.js. La decisión depende de QUÉ llegó en el
// body, no es estática por ruta, por eso vive acá y no en un middleware.
const update = asyncHandler(async (req, res) => {
  const bodyKeys = Object.keys(req.body);
  const esSoloContacto = bodyKeys.length > 0 && bodyKeys.every((k) => CONTACT_FIELDS.has(k));

  if (!esSoloContacto) {
    const roles = req.usuario.roles ?? [];
    const funcionalidadesAdicionales = req.usuario.funcionalidades_adicionales ?? [];
    const funcionalidadesPorRol = await getRolesFuncionalidades();
    if (!tienePermiso(roles, funcionalidadesAdicionales, 'editar_terceros', funcionalidadesPorRol, req.usuario.esAdmin)) {
      throw new ApiError(403, 'No tiene permiso para editar terceros');
    }
  }

  ok(res, await service.update(req.params.id, req.body));
});

const remove = asyncHandler(async (req, res) => {
  const roles = req.usuario.roles ?? [];
  const funcionalidadesAdicionales = req.usuario.funcionalidades_adicionales ?? [];
  const funcionalidadesPorRol = await getRolesFuncionalidades();
  if (!tienePermiso(roles, funcionalidadesAdicionales, 'editar_terceros', funcionalidadesPorRol, req.usuario.esAdmin)) {
    throw new ApiError(403, 'No tiene permiso para eliminar terceros');
  }
  await service.remove(req.params.id);
  noContent(res);
});

module.exports = { list, getById, create, update, remove };
