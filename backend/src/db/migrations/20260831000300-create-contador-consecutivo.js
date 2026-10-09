'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contador_consecutivos', {
      tipo: { type: Sequelize.STRING(100), primaryKey: true, allowNull: false },
      anio: { type: Sequelize.INTEGER, allowNull: false },
      ultimo: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    });
  },
};
