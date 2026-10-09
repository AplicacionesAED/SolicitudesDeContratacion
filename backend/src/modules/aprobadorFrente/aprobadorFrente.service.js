const ApiError = require('../../utils/ApiError');
const AprobadorFrente = require('./aprobadorFrente.model');
const Frente = require('../frente/frente.model');
const { getRolesPorCodigo } = require('../../utils/permisos');

// GET siempre devuelve una fila -- crea la config vacía la primera vez que se
// consulta un (frente, categoria) que todavía no tiene una (evita que el
// frontend tenga que distinguir "no existe" de "existe pero vacía").
//
// `director_tecnico`/`controles_adpro` de una fila NUEVA arrancan con el rol
// de sistema correspondiente pre-cargado (mismo comportamiento de siempre,
// "no cambiar nada el día del deploy") -- resuelto contra el nombre ACTUAL
// del rol (2026-09-18: un `defaultValue` de Sequelize no puede consultar la
// BD, así que esto no puede vivir en el modelo -- ver la nota en
// aprobadorFrente.model.js). Si el admin renombra DIRECTOR_TECNICO/CONTROLES
// después, un Frente nuevo sigue arrancando con el nombre correcto.
async function getByFrenteId(frenteId, categoria) {
  const frente = await Frente.findByPk(frenteId);
  if (!frente) throw new ApiError(404, 'Frente no encontrado');

  const rp = await getRolesPorCodigo();
  const [config] = await AprobadorFrente.findOrCreate({
    where: { frente_id: frenteId, categoria },
    defaults: {
      frente_id: frenteId,
      categoria,
      director_tecnico: { usuarios: [], roles: [rp.DIRECTOR_TECNICO] },
      controles_adpro: { usuarios: [], roles: [rp.CONTROLES] },
    },
  });
  return config;
}

async function update(frenteId, categoria, data) {
  const config = await getByFrenteId(frenteId, categoria);
  await config.update(data);
  return config;
}

module.exports = { getByFrenteId, update };
