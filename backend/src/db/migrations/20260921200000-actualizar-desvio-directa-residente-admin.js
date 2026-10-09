'use strict';

// 2026-09-21: nueva participación del Residente Administrativo en el flujo
// de Directa. Hoy APROBAR_DIRECTOR/DIRECTA manda directo a
// EN_PROYECCION_CONTROLES (sembrado en 20260918130300-seed-desvio-aprobar-
// director-directa.js). Ahora debe ir PRIMERO a PENDIENTE_RESIDENTE_
// ADMINISTRATIVO, y desde ahí la acción APROBAR_RESIDENTE_ADMINISTRATIVO
// (la cablea Jim en código, destino fijo) sigue a EN_PROYECCION_CONTROLES
// como hasta ahora. No toca workflow_desvios/estado_destino -- sólo la fila
// puntual ya sembrada, mismo mecanismo de desvíos condicionales de siempre.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate(
      'workflow_desvios',
      {
        estado_destino: 'PENDIENTE_RESIDENTE_ADMINISTRATIVO',
        actualizado_en: new Date(),
      },
      { accion: 'APROBAR_DIRECTOR', condicion_categoria: 'DIRECTA' }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate(
      'workflow_desvios',
      {
        estado_destino: 'EN_PROYECCION_CONTROLES',
        actualizado_en: new Date(),
      },
      { accion: 'APROBAR_DIRECTOR', condicion_categoria: 'DIRECTA' }
    );
  },
};
