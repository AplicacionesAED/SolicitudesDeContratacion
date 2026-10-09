'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('especialidades', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      descripcion: { type: Sequelize.STRING(500), allowNull: true },
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      actualizado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
};
