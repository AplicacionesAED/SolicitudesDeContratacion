'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tercero_especialidades', {
      tercero_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'terceros', key: 'id' },
        onDelete: 'CASCADE',
      },
      especialidad_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'especialidades', key: 'id' },
        onDelete: 'CASCADE',
      },
    });
  },
};
