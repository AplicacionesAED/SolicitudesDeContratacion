const ApiError = require('../../utils/ApiError');
const { QueryTypes } = require('sequelize');
const sequelize = require('../../config/db');
const Especialidad = require('./especialidad.model');
const TerceroEspecialidad = require('../tercero/terceroEspecialidad.model');

// Cada especialidad incluye `total_terceros` (cuantos terceros la tienen asignada): permite ver cuales se usan,
// cuales no (candidatas a limpiar) y detectar duplicadas para fusionarlas.
async function list() {
  const [especialidades, conteos] = await Promise.all([
    Especialidad.findAll({ order: [['nombre', 'ASC']] }),
    sequelize.query('SELECT especialidad_id, COUNT(*)::int AS total FROM tercero_especialidades GROUP BY especialidad_id', { type: QueryTypes.SELECT }),
  ]);
  const porId = new Map(conteos.map((c) => [c.especialidad_id, c.total]));
  return especialidades.map((e) => ({ ...e.toJSON(), total_terceros: porId.get(e.id) ?? 0 }));
}

// Terceros que tienen asignada una especialidad (para revisar a quien afecta antes de editarla, fusionarla o borrarla).
async function listTerceros(id) {
  const especialidad = await Especialidad.findByPk(id);
  if (!especialidad) throw new ApiError(404, 'Especialidad no encontrada');
  return sequelize.query(
    `SELECT t.id, t.razon_social AS "razonSocial", t.nit
       FROM terceros t JOIN tercero_especialidades te ON te.tercero_id = t.id
      WHERE te.especialidad_id = :id ORDER BY t.razon_social`,
    { replacements: { id }, type: QueryTypes.SELECT }
  );
}

// Fusiona `origenId` dentro de `destinoId`: los terceros de la primera pasan a la segunda (sin duplicar a quien ya
// tenia las dos) y la de origen se elimina. Util para unificar nombres repetidos ("Estructura" / "Estructuras").
async function fusionar(origenId, destinoId) {
  if (Number(origenId) === Number(destinoId)) throw new ApiError(400, 'Elige una especialidad de destino distinta');
  const [origen, destino] = await Promise.all([Especialidad.findByPk(origenId), Especialidad.findByPk(destinoId)]);
  if (!origen || !destino) throw new ApiError(404, 'Especialidad no encontrada');
  return sequelize.transaction(async (transaction) => {
    const [, movidos] = await sequelize.query(
      `INSERT INTO tercero_especialidades (tercero_id, especialidad_id)
       SELECT tercero_id, :destino FROM tercero_especialidades WHERE especialidad_id = :origen
       ON CONFLICT DO NOTHING`,
      { replacements: { origen: origen.id, destino: destino.id }, transaction }
    );
    await TerceroEspecialidad.destroy({ where: { especialidad_id: origen.id }, transaction });
    await origen.destroy({ transaction });
    return { destino: destino.nombre, terceros_movidos: movidos ?? 0 };
  });
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
  // Una especialidad en uso no se borra a ciegas (los terceros la perderian en silencio): se fusiona con otra o se
  // quita de esos terceros primero.
  const enUso = await TerceroEspecialidad.count({ where: { especialidad_id: especialidad.id } });
  if (enUso > 0) throw new ApiError(409, `La especialidad está asignada a ${enUso} tercero(s). Fusiónala con otra o quítala de ellos antes de eliminarla.`);
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

module.exports = { list, listTerceros, fusionar, create, update, remove, importarNombres };
