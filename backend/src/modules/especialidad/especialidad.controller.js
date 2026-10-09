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
const listTerceros = asyncHandler(async (req, res) => ok(res, await service.listTerceros(req.params.id)));
const fusionar = asyncHandler(async (req, res) => ok(res, await service.fusionar(req.params.id, req.body.destino_id)));
const importar = asyncHandler(async (req, res) => ok(res, await service.importarNombres(req.body.nombres)));

module.exports = { list, listTerceros, fusionar, create, update, remove, importar };
