// Módulo Workflows: una fila fija por acción del motor de aprobación de
// Solicitud (11 filas, sembradas por 20260831000105-seed-workflow.js) --
// `permisos_base` reemplaza el `TRANSICIONES[accion].permisosPermitidos`
// hardcodeado de solicitud.estado.js. La secuencia de estados en sí
// (estadosOrigen/estadoDestino) NO es configurable, sigue en código -- este
// módulo solo cubre qué permiso exige cada acción y los desvíos
// condicionales (ver create-workflow-desvio).
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('workflow_pasos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      accion: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      permisos_base: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      actualizado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
};
