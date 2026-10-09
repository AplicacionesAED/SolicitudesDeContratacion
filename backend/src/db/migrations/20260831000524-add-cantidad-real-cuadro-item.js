// "La cantidad deben ser independiente" -- pedido explícito del usuario:
// la tabla de arriba (Pendiente por consumir) y la de abajo (Cantidades
// reales) editan cantidades DISTINTAS, no el mismo campo -- ver
// CuadroComparativoBuilder.jsx. `cantidad` sigue siendo "Pendiente por
// consumir"; esta columna nueva es "Cantidades reales".
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('cuadro_comparativo_items', 'cantidad_real', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },
};
