'use strict';

// Flujo propio de Directa (Orden de Servicio), 2026-09-18 -- columnas
// nuevas en `solicitudes`: la fecha de aprobación de Controles-Proyección
// (mismo patrón que fecha_aprobacion_director, se estampa sola al
// ejecutar APROBAR_PROYECCION -- ver solicitud.estado.js) y 3 columnas de
// snapshot (mismo criterio que aprobador_id/responsable_contratos_tramite_id/
// etc.: quien queda asignado a un slot al crearse la solicitud puede
// actuar aunque después AprobadorFrente cambie -- ver
// solicitud.autorizacion.js#SNAPSHOT_POR_SLOT).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('solicitudes', 'fecha_aprobacion_controles_proyeccion', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('solicitudes', 'responsable_controles_proyeccion_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('solicitudes', 'responsable_residente_administrativo_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('solicitudes', 'responsable_controles_aprobacion_final_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
};
