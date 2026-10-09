// Reemplaza el booleano `ver_todas_solicitudes` (2 estados: "todas" o
// "propias+de mi frente" atados como un solo paquete) por un selector de 3
// niveles `alcance_solicitudes` (2026-09-02, pedido explícito: "que se pueda
// ver las propias, o la de los frentes asignados, o todas"):
//   PROPIAS -- solo lo que el usuario creó (solicitante_id).
//   FRENTE  -- lo mismo que antes hacía `ver_todas_solicitudes: false`:
//              propias + donde es responsable en algún paso (snapshot de
//              AprobadorFrente al crearse) + lo que pertenece a un frente
//              asignado.
//   TODAS   -- lo mismo que antes hacía `ver_todas_solicitudes: true`.
// Nadie pierde acceso el día del deploy: `true` -> TODAS, `false` -> FRENTE
// (el paquete completo que ya tenían, nunca el más restrictivo PROPIAS --
// ese nivel queda disponible para que el admin lo asigne a mano si quiere
// restringir a alguien más adelante).
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('roles', 'alcance_solicitudes', {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: 'FRENTE',
    });

    await queryInterface.sequelize.query(`
      UPDATE roles SET alcance_solicitudes = CASE WHEN ver_todas_solicitudes THEN 'TODAS' ELSE 'FRENTE' END
    `);

    await queryInterface.removeColumn('roles', 'ver_todas_solicitudes');
  },
};
