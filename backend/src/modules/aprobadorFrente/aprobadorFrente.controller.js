const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const service = require('./aprobadorFrente.service');

function categoriaValida(valor) {
  if (valor !== 'DIRECTA' && valor !== 'INDIRECTA') throw new ApiError(400, 'categoria debe ser DIRECTA o INDIRECTA');
  return valor;
}

const getByFrenteId = asyncHandler(async (req, res) => ok(res, await service.getByFrenteId(req.params.frenteId, categoriaValida(req.query.categoria))));
const update = asyncHandler(async (req, res) => {
  const { categoria, ...data } = req.body;
  ok(res, await service.update(req.params.frenteId, categoriaValida(categoria), data));
});

module.exports = { getByFrenteId, update };
