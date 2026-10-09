'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('frente_usuarios', {
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE',
      },
      frente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'frentes', key: 'id' },
        onDelete: 'CASCADE',
      },
    });
  },
};
