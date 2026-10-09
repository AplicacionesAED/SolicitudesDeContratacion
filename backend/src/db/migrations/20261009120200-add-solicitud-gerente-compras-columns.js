'use strict';

// Flujo propio de Directa, 2026-10-09 -- columnas nuevas en `solicitudes`
// para el paso del Gerente de Compras: snapshot del responsable asignado al
// crearse (mismo criterio que responsable_residente_administrativo_id/etc.,
// ver solicitud.autorizacion.js#SNAPSHOT_POR_SLOT) y la fecha de su
// aprobación (mismo patrón que fecha_aprobacion_residente_administrativo,
// se estampa sola al ejecutar APROBAR_GERENTE_COMPRAS -- ver
// solicitud.estado.js).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('solicitudes', 'responsable_gerente_compras_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('solicitudes', 'fecha_aprobacion_gerente_compras', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('solicitudes', 'responsable_gerente_compras_id');
    await queryInterface.removeColumn('solicitudes', 'fecha_aprobacion_gerente_compras');
  },
};
