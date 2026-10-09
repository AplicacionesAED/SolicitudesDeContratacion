const ApiError = require('../../utils/ApiError');
const sequelize = require('../../config/db');
const Frente = require('./frente.model');
const FrenteUsuario = require('./frenteUsuario.model');
const Proyecto = require('../proyecto/proyecto.model');
const Usuario = require('../usuario/usuario.model');

async function list({ proyectoId } = {}) {
  const frentes = await Frente.findAll({
    where: proyectoId ? { proyecto_id: proyectoId } : {},
    include: [
      { model: Proyecto, as: 'proyecto', attributes: ['id', 'nombre'] },
      // Solo los IDs -- el wizard de Solicitudes (Fase 4) filtra a "mis
      // frentes asignados" en el cliente, mismo criterio que el original.
      { model: Usuario, as: 'usuarios', attributes: ['id'], through: { attributes: [] } },
    ],
    order: [['nombre', 'ASC']],
  });
  return frentes.map((f) => {
    const json = f.toJSON();
    json.usuarioIds = (json.usuarios ?? []).map((u) => u.id);
    delete json.usuarios;
    return json;
  });
}

async function getById(id) {
  const frente = await Frente.findByPk(id, {
    include: [
      { model: Proyecto, as: 'proyecto', attributes: ['id', 'nombre'] },
      { model: Usuario, as: 'usuarios', attributes: ['id', 'nombre', 'email', 'roles'], through: { attributes: [] } },
    ],
  });
  if (!frente) throw new ApiError(404, 'Frente no encontrado');
  return frente;
}

async function create(data) {
  return Frente.create(data);
}

async function update(id, data) {
  const frente = await Frente.findByPk(id);
  if (!frente) throw new ApiError(404, 'Frente no encontrado');
  await frente.update(data);
  return frente;
}

// Reemplaza TODA la asignación de usuarios de un frente por la lista dada --
// más simple que un diff add/remove, y el volumen (unos pocos usuarios por
// frente) no justifica la complejidad de un diff.
async function setUsuarios(frenteId, usuarioIds) {
  const frente = await Frente.findByPk(frenteId);
  if (!frente) throw new ApiError(404, 'Frente no encontrado');

  await sequelize.transaction(async (transaction) => {
    await FrenteUsuario.destroy({ where: { frente_id: frenteId }, transaction });
    if (usuarioIds.length > 0) {
      await FrenteUsuario.bulkCreate(
        usuarioIds.map((usuarioId) => ({ frente_id: frenteId, usuario_id: usuarioId })),
        { transaction }
      );
    }
  });

  return getById(frenteId);
}

module.exports = { list, getById, create, update, setUsuarios };
