const ApiError = require('../../utils/ApiError');
const Proyecto = require('./proyecto.model');

async function list({ includeInactive } = {}) {
  return Proyecto.findAll({ where: includeInactive ? {} : { activo: true }, order: [['nombre', 'ASC']] });
}

async function getById(id) {
  const proyecto = await Proyecto.findByPk(id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');
  return proyecto;
}

async function create(data) {
  return Proyecto.create(data);
}

async function update(id, data) {
  const proyecto = await getById(id);
  await proyecto.update(data);
  return proyecto;
}

module.exports = { list, getById, create, update };
