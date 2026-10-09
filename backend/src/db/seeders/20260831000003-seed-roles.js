// Siembra los 8 roles de negocio + ADMIN en la tabla `roles`, con los mismos
// permisos base (FUNCIONALIDADES_POR_ROL) y el mismo alcance de solicitudes
// (FALLBACK_ALCANCE_SOLICITUDES) que utils/permisos.js trae hardcodeado --
// una vez esta tabla tiene filas, ES la fuente real (el mapa hardcodeado pasa
// a ser solo el fallback si la tabla está vacía). Idempotente.
'use strict';

const { FUNCIONALIDADES_POR_ROL, FALLBACK_ALCANCE_SOLICITUDES } = require('../../utils/permisos');

module.exports = {
  async up(queryInterface) {
    const [existentes] = await queryInterface.sequelize.query('SELECT COUNT(*)::int AS total FROM roles');
    if (existentes[0].total > 0) return;

    const ahora = new Date();
    const filas = Object.entries(FUNCIONALIDADES_POR_ROL).map(([nombre, permisos]) => ({
      nombre,
      permisos: JSON.stringify(permisos),
      alcance_solicitudes: FALLBACK_ALCANCE_SOLICITUDES[nombre] ?? 'FRENTE',
      creado_en: ahora,
      actualizado_en: ahora,
    }));

    await queryInterface.bulkInsert('roles', filas);
  },
};
