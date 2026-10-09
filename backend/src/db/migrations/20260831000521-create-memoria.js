'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('memorias', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      solicitud_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'solicitudes', key: 'id' } },
      titulo: { type: Sequelize.STRING(300), allowNull: true },
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
};
