// Solicitudes Directas: nueva dimensión sobre el dominio ya existente -- toda
// solicitud real migrada en la Fase 9 es INDIRECTA (lo único que existía
// hasta ahora), por eso el default. Se indexa porque `categoria` pasa a ser
// el filtro principal de cada listado (a diferencia de `tipo`, que no tiene
// índice propio).
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('solicitudes', 'categoria', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'INDIRECTA',
    });
    await queryInterface.addIndex('solicitudes', ['categoria']);
  },
};
