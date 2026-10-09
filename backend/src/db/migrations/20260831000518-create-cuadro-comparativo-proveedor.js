'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cuadro_comparativo_proveedores', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      cuadro_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'cuadros_comparativos', key: 'id' }, onDelete: 'CASCADE' },
      nombre: { type: Sequelize.STRING(200), allowNull: false },
      seleccionado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      administracion_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      imprevisto_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      utilidad_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      iva_utilidad_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    });
    await queryInterface.addIndex('cuadro_comparativo_proveedores', ['cuadro_id']);
  },
};
