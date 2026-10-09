const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const service = require('./dashboard.service');

const stats = asyncHandler(async (req, res) => ok(res, await service.stats(req.usuario)));
const recientes = asyncHandler(async (req, res) => ok(res, await service.recientes(req.usuario, req.query.limit ? Number(req.query.limit) : 10)));

module.exports = { stats, recientes };
