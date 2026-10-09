'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('memoria_columnas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      memoria_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'memorias', key: 'id' }, onDelete: 'CASCADE' },
      nombre: { type: Sequelize.STRING(200), allowNull: false },
      tipo: { type: Sequelize.STRING(20), allowNull: false },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      // Solo tiene sentido para tipo = 'CALCULADA' -- FK a otra fila de esta
      // MISMA tabla. Se resuelven en una 2ª pasada al guardar (ver
      // memoria.js#upsertMemoria), por eso quedan nullable acá.
      formula_columna_a_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'memoria_columnas', key: 'id' }, onDelete: 'SET NULL' },
      formula_operador: { type: Sequelize.STRING(1), allowNull: true },
      formula_columna_b_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'memoria_columnas', key: 'id' }, onDelete: 'SET NULL' },
      mostrar_total: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    });
    await queryInterface.addIndex('memoria_columnas', ['memoria_id']);
  },
};
