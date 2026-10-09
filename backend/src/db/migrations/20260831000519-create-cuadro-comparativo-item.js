'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cuadro_comparativo_items', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      cuadro_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'cuadros_comparativos', key: 'id' }, onDelete: 'CASCADE' },
      codigo_item: { type: Sequelize.STRING(50), allowNull: true },
      codigo_insumo: { type: Sequelize.STRING(50), allowNull: true },
      actividad: { type: Sequelize.STRING(300), allowNull: false },
      alcance: { type: Sequelize.STRING(300), allowNull: true },
      unidad: { type: Sequelize.STRING(30), allowNull: true },
      cantidad: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      observaciones: { type: Sequelize.TEXT, allowNull: true },
      precios: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    });
    await queryInterface.addIndex('cuadro_comparativo_items', ['cuadro_id']);
  },
};
