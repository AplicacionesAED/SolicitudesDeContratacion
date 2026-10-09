// Seed idempotente: crea el primer admin solo si no existe ningun usuario
// todavia. Password temporal -- debe_cambiar_password=true fuerza el cambio
// en el primer login. `roles` es un array (ver usuario.model.js) -- ADMIN
// dentro del array es bypass total, no un `rol` string separado.
'use strict';

const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = 'admin@baiak.com';
const ADMIN_PASSWORD_TEMPORAL = 'CambiarEnPrimerLogin2026!';

module.exports = {
  async up(queryInterface) {
    const [existentes] = await queryInterface.sequelize.query('SELECT COUNT(*)::int AS total FROM usuarios');
    if (existentes[0].total > 0) return;

    const hashed = await bcrypt.hash(ADMIN_PASSWORD_TEMPORAL, 10);
    await queryInterface.bulkInsert('usuarios', [
      {
        email: ADMIN_EMAIL,
        nombre: 'Administrador',
        hashed_password: hashed,
        roles: JSON.stringify(['ADMIN']),
        funcionalidades_adicionales: JSON.stringify([]),
        activo: true,
        debe_cambiar_password: true,
        creado_en: new Date(),
        actualizado_en: new Date(),
      },
    ]);

    // eslint-disable-next-line no-console
    console.log(`Usuario admin creado: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD_TEMPORAL} (cambiar en el primer login)`);
  },
};
