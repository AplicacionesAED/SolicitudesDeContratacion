'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('aprobador_frentes', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      frente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'frentes', key: 'id' },
      },
      aprobador_ids: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      contratos_tramite_ids: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      contratos_minuta_ids: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      controles_id: { type: Sequelize.INTEGER, allowNull: true },
      director_controles_ids: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      actualizado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
};
