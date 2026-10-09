'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sesiones_usuario', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      usuario_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' }, onDelete: 'CASCADE' },
      inicio: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      fin: { type: Sequelize.DATE, allowNull: true },
      duracion_seg: { type: Sequelize.INTEGER, allowNull: true },
      ip: { type: Sequelize.STRING(64), allowNull: true },
      user_agent: { type: Sequelize.STRING(255), allowNull: true },
      dispositivo: { type: Sequelize.STRING(20), allowNull: true },
      navegador: { type: Sequelize.STRING(30), allowNull: true },
      sistema_op: { type: Sequelize.STRING(30), allowNull: true },
    });
    await queryInterface.addIndex('sesiones_usuario', ['usuario_id', 'inicio']);
  },
};
