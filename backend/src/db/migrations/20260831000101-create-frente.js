'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('frentes', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: Sequelize.STRING(200), allowNull: false },
      etapa: { type: Sequelize.INTEGER, allowNull: true },
      proyecto_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'proyectos', key: 'id' },
      },
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      actualizado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('frentes', ['proyecto_id']);
  },
};
