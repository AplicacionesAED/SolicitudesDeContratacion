'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cronograma_contratos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      solicitud_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'solicitudes', key: 'id' } },
      tiene_fases: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      fecha_inicio: { type: Sequelize.DATEONLY, allowNull: false },
      fecha_fin: { type: Sequelize.DATEONLY, allowNull: false },
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
};
