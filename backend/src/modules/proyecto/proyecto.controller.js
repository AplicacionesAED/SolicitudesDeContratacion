const asyncHandler = require('../../utils/asyncHandler');
const { ok, created } = require('../../utils/ApiResponse');
const service = require('./proyecto.service');

const list = asyncHandler(async (req, res) => ok(res, await service.list({ includeInactive: req.query.includeInactive === 'true' })));
const getById = asyncHandler(async (req, res) => ok(res, await service.getById(req.params.id)));
const create = asyncHandler(async (req, res) => created(res, await service.create(req.body)));
const update = asyncHandler(async (req, res) => ok(res, await service.update(req.params.id, req.body)));

module.exports = { list, getById, create, update };
