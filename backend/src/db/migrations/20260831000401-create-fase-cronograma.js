'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fase_cronogramas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      cronograma_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'cronograma_contratos', key: 'id' }, onDelete: 'CASCADE' },
      numero_fase: { type: Sequelize.INTEGER, allowNull: false },
      nombre_fase: { type: Sequelize.STRING(200), allowNull: false },
      fecha_inicio: { type: Sequelize.DATEONLY, allowNull: false },
      fecha_fin: { type: Sequelize.DATEONLY, allowNull: false },
    });
    await queryInterface.addIndex('fase_cronogramas', ['cronograma_id']);
  },
};
