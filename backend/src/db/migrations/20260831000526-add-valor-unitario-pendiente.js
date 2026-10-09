// "Pendiente por consumir" ganó VR. Unit -- fiel a la hoja Excel real
// (columnas UN/CANT.TOTAL/VR.UNIT/V.TOTAL). `V. Total` (de Pendiente) y
// `V. Total según PPTO` (de Cantidades reales) NUNCA se guardan -- se
// calculan en el frontend a partir de este valor + cantidad/cantidadReal,
// mismo criterio que valorTotal por proveedor (ver CuadroComparativoBuilder.jsx).
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('cuadro_comparativo_items', 'valor_unitario_pendiente', {
      // DECIMAL(18,2) -- misma precisión que Solicitud.valor_final
      // (solicitud.model.js), la convención de este proyecto para
      // columnas de dinero reales (no JSONB como `precios`).
      type: Sequelize.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },
};
