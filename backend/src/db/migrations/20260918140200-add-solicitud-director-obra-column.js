'use strict';

// Flujo propio de Directa (Orden de Servicio), 2026-09-18 -- snapshot de
// quién queda asignado al slot `director_obra` al crearse la solicitud
// (mismo criterio que aprobador_id para director_proyecto -- ver
// solicitud.autorizacion.js#SNAPSHOT_POR_SLOT). Columna aparte de
// `aprobador_id` a propósito: ese campo sigue siendo específico de
// `director_proyecto`/Indirecta, no se reutiliza para Directa.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('solicitudes', 'responsable_director_obra_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
};
