const asyncHandler = require('../../utils/asyncHandler');
const { ok, created, noContent } = require('../../utils/ApiResponse');
const service = require('./especialidad.service');

const list = asyncHandler(async (req, res) => ok(res, await service.list()));
const create = asyncHandler(async (req, res) => created(res, await service.create(req.body)));
const update = asyncHandler(async (req, res) => ok(res, await service.update(req.params.id, req.body)));
const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  noContent(res);
});
const importar = asyncHandler(async (req, res) => ok(res, await service.importarNombres(req.body.nombres)));

module.exports = { list, create, update, remove, importar };
