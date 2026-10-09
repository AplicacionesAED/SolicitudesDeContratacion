'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('memoria_filas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      memoria_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'memorias', key: 'id' }, onDelete: 'CASCADE' },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      // Mapa `{ [columnaId]: valor }` -- forma de `valor` según el `tipo` de
      // esa columna (ver el comentario grande en memoria.model.js). Nunca
      // trae una entrada para una columna `CALCULADA` -- se calcula en el
      // frontend en cada render.
      valores: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
    });
    await queryInterface.addIndex('memoria_filas', ['memoria_id']);
  },
};
