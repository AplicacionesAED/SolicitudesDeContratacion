const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const { ok, created, noContent } = require('../../utils/ApiResponse');
const service = require('./workflow.service');

const listDesvios = asyncHandler(async (req, res) => ok(res, await service.listDesvios(req.query.accion)));
const createDesvio = asyncHandler(async (req, res) => created(res, await service.createDesvio(req.body)));
const updateDesvio = asyncHandler(async (req, res) => ok(res, await service.updateDesvio(req.params.id, req.body)));
const removeDesvio = asyncHandler(async (req, res) => {
  await service.removeDesvio(req.params.id);
  noContent(res);
});

const getLayout = asyncHandler(async (req, res) => {
  const { categoria } = req.query;
  if (categoria !== 'DIRECTA' && categoria !== 'INDIRECTA') throw new ApiError(400, 'categoria debe ser DIRECTA o INDIRECTA');
  ok(res, await service.getLayout(categoria));
});
const saveLayout = asyncHandler(async (req, res) => ok(res, await service.saveLayout(req.body.categoria, req.body.posiciones)));

module.exports = { listDesvios, createDesvio, updateDesvio, removeDesvio, getLayout, saveLayout };
