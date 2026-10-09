'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('actividad_cronogramas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      cronograma_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'cronograma_contratos', key: 'id' }, onDelete: 'CASCADE' },
      fase_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'fase_cronogramas', key: 'id' }, onDelete: 'CASCADE' },
      descripcion: { type: Sequelize.STRING(500), allowNull: false },
      fecha_inicio: { type: Sequelize.DATEONLY, allowNull: false },
      fecha_fin: { type: Sequelize.DATEONLY, allowNull: false },
      responsable: { type: Sequelize.STRING(200), allowNull: true },
    });
    await queryInterface.addIndex('actividad_cronogramas', ['cronograma_id']);
    await queryInterface.addIndex('actividad_cronogramas', ['fase_id']);
  },
};
