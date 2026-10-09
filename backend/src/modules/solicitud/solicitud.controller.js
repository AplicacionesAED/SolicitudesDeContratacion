const asyncHandler = require('../../utils/asyncHandler');
const { ok, created, noContent } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { getRolesFuncionalidades } = require('../../utils/permisos');
const { tieneCrearSolicitudes, puedeListarSolicitudes } = require('./solicitud.autorizacion');
const service = require('./solicitud.service');

const list = asyncHandler(async (req, res) => {
  // Todos los llamadores reales (SolicitudesPage/OtrosiForm/
  // ImportarHistoricoPage) siempre pasan `categoria` -- si viene, exige
  // ver O crear esa categoría (2026-09-02 "desglose ver/crear": antes
  // CUALQUIER autenticado podía listar cualquier categoría, el filtro real
  // era solo por registro dentro del resultado). Sin categoria en la query
  // no se gatea acá -- ningún llamador real la omite hoy.
  if (req.query.categoria) {
    const funcionalidadesPorRol = await getRolesFuncionalidades();
    if (!puedeListarSolicitudes(req.usuario, req.query.categoria, funcionalidadesPorRol)) {
      throw new ApiError(403, 'No tienes acceso a esta sección de solicitudes. Contacta al administrador.');
    }
  }
  ok(res, await service.list(req.query, req.usuario));
});
const getById = asyncHandler(async (req, res) => ok(res, await service.getById(req.params.id, req.usuario)));

const create = asyncHandler(async (req, res) => {
  const funcionalidadesPorRol = await getRolesFuncionalidades();

  // categoria ya viene validada por Zod (DIRECTA|INDIRECTA). Un solo permiso
  // de CREAR cubre crear normal, otrosí y diseño de una -- ya no hay
  // distinción fina entre esos tres (2026-09-02, "eliminar permisos de rol
  // para solicitudes"). Para un otrosí, esto es solo el gate de entrada: el
  // service valida que la categoria coincida con la del padre y persiste
  // siempre la real del padre.
  if (!tieneCrearSolicitudes(req.usuario, req.body.categoria, funcionalidadesPorRol)) {
    throw new ApiError(403, 'No tienes permiso para crear solicitudes de esta categoría. Contacta al administrador.');
  }

  created(res, await service.create(req.body, req.usuario));
});

const update = asyncHandler(async (req, res) => ok(res, await service.update(req.params.id, req.body, req.usuario)));

const completarHistorico = asyncHandler(async (req, res) => ok(res, await service.completarHistorico(req.params.id, req.usuario)));

const remove = asyncHandler(async (req, res) => {
  if (!req.usuario.esAdmin) throw new ApiError(403, 'Solo el administrador puede eliminar solicitudes');
  await service.remove(req.params.id);
  noContent(res);
});

module.exports = { list, getById, create, update, remove, completarHistorico };
