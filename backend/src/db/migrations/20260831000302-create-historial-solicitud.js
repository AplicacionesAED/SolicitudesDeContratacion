'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('historial_solicitudes', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      solicitud_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'solicitudes', key: 'id' } },
      usuario_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
      accion: { type: Sequelize.STRING(60), allowNull: false },
      nota: { type: Sequelize.TEXT, allowNull: true },
      fecha: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('historial_solicitudes', ['solicitud_id']);
  },
};
