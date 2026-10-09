'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cuadros_comparativos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      solicitud_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'solicitudes', key: 'id' } },
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
};
