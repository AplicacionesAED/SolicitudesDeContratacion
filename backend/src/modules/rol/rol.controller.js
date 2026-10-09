const asyncHandler = require('../../utils/asyncHandler');
const { ok, created } = require('../../utils/ApiResponse');
const { FUNCIONALIDADES_DISPONIBLES } = require('../../utils/permisos');
const service = require('./rol.service');

const list = asyncHandler(async (req, res) => ok(res, await service.list()));
const create = asyncHandler(async (req, res) => created(res, await service.create(req.body)));
const update = asyncHandler(async (req, res) => ok(res, await service.update(req.params.nombre, req.body)));
const funcionalidadesDisponibles = asyncHandler(async (req, res) => ok(res, FUNCIONALIDADES_DISPONIBLES));

module.exports = { list, create, update, funcionalidadesDisponibles };
