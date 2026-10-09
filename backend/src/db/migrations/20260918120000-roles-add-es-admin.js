'use strict';

// Pedido explicito del usuario (2026-09-18): poder renombrar el rol "ADMIN"
// sin que eso rompa el acceso de administrador. Hasta ahora, mas de 15
// lugares del backend comparaban el string literal 'ADMIN' contra
// usuario.roles -- renombrar la fila rompia ese acceso para cualquier
// usuario que la tuviera. `es_admin` es un flag estable, ligado a la fila
// (no al nombre) -- requireAuth resuelve `usuario.esAdmin` una vez por
// request contra este flag, y todos esos chequeos ahora usan ese resultado
// en vez del string. No se expone en la API de creacion/edicion de roles
// (rol.schema.js) a proposito: es un flag interno, sembrado una sola vez
// aca, no algo que un admin deba poder marcar/desmarcar en cualquier rol.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('roles', 'es_admin', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.sequelize.query("UPDATE roles SET es_admin = true WHERE nombre = 'ADMIN'");
  },
};
