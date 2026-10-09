// Módulo Workflows: desvíos condicionales por acción (0 o más por acción) --
// reemplaza el único `if` hardcodeado de solicitud.estado.js (ENVIAR va a
// PENDIENTE_DIRECTOR_TECNICO si el solicitante es TECNICA y la solicitud es
// INDIRECTA). `condicion_rol`/`condicion_categoria` NULL = "cualquiera" (sin
// esa condición); ambas se evalúan con AND dentro de una fila.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('workflow_desvios', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      accion: { type: Sequelize.STRING(40), allowNull: false },
      condicion_rol: { type: Sequelize.STRING(30), allowNull: true },
      condicion_categoria: { type: Sequelize.STRING(20), allowNull: true },
      estado_destino: { type: Sequelize.STRING(40), allowNull: false },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      actualizado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('workflow_desvios', ['accion']);
  },
};
