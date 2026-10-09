'use strict';

// Flujo propio de Directa, 2026-10-09 (pedido explícito del usuario): paso
// nuevo AL FINAL del flujo -- después de la aprobación de Director/a de
// Controles (el viejo "Aprobación Final", que se queda con el mismo estado
// técnico APROBACION_FINAL, solo cambia la etiqueta visible), aprueba el
// Gerente de Compras antes de que la solicitud quede Completada. Mismo
// patrón que 20260918140100-add-aprobador-frente-director-obra.js -- un
// slot JSONB más en AprobadorFrente, sin rol de sistema precargado (100%
// nuevo, sin comportamiento previo que preservar).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('aprobador_frentes', 'gerente_compras', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: { usuarios: [], roles: [] },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('aprobador_frentes', 'gerente_compras');
  },
};
