'use strict';

// 2026-09-21: ampliar `solicitudes.tipo_contrato` de VARCHAR(20) a
// VARCHAR(40). El código 'SUMINISTRO_MATERIALES' (21 caracteres) para la
// categoría DIRECTA se pasa del límite actual y un insert/update con ese
// valor tira 'value too long for type character varying(20)'. Es solo
// ensanchar la columna; no toca valores ni arrays de códigos/labels.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('solicitudes', 'tipo_contrato', {
      type: Sequelize.STRING(40),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('solicitudes', 'tipo_contrato', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },
};