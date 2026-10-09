const ApiError = require('../../utils/ApiError');
const Especialidad = require('./especialidad.model');

async function list() {
  return Especialidad.findAll({ order: [['nombre', 'ASC']] });
}

async function create(data) {
  const nombre = data.nombre.trim();
  const existente = await Especialidad.findOne({ where: { nombre } });
  if (existente) throw new ApiError(409, 'Ya existe una especialidad con ese nombre');
  return Especialidad.create({ nombre, descripcion: data.descripcion?.trim() || null });
}

async function update(id, data) {
  const especialidad = await Especialidad.findByPk(id);
  if (!especialidad) throw new ApiError(404, 'Especialidad no encontrada');

  const values = {};
  if (data.nombre !== undefined) {
    const nombre = data.nombre.trim();
    if (!nombre) throw new ApiError(400, 'El nombre no puede estar vacío');
    if (nombre !== especialidad.nombre) {
      const duplicado = await Especialidad.findOne({ where: { nombre } });
      if (duplicado) throw new ApiError(409, 'Ya existe una especialidad con ese nombre');
    }
    values.nombre = nombre;
  }
  if (data.descripcion !== undefined) values.descripcion = data.descripcion?.trim() || null;

  await especialidad.update(values);
  return especialidad;
}

async function remove(id) {
  const especialidad = await Especialidad.findByPk(id);
  if (!especialidad) throw new ApiError(404, 'Especialidad no encontrada');
  await especialidad.destroy();
}

// Alta masiva por nombre (ej. pegar una lista) -- crea solo los que no existen
// todavía, nunca falla por los que ya están (skipDuplicates).
async function importarNombres(nombres) {
  const trimmed = [...new Set(nombres.map((n) => n.trim()).filter(Boolean))];
  const existentes = await Especialidad.findAll({ where: { nombre: trimmed }, attributes: ['nombre'] });
  const existentesSet = new Set(existentes.map((e) => e.nombre));
  const nuevos = trimmed.filter((n) => !existentesSet.has(n));

  if (nuevos.length > 0) {
    await Especialidad.bulkCreate(nuevos.map((nombre) => ({ nombre, descripcion: null })));
  }
  return { created: nuevos.length, skipped: trimmed.length - nuevos.length };
}

module.exports = { list, create, update, remove, importarNombres };
