'use strict';

// 2026-09-21: nueva columna de fecha para el punto nuevo del Residente
// Administrativo en Directa (mismo criterio que fecha_aprobacion_controles_
// proyeccion, agregada en 20260918130100-add-solicitud-directa-columns.js).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('solicitudes', 'fecha_aprobacion_residente_administrativo', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('solicitudes', 'fecha_aprobacion_residente_administrativo');
  },
};
