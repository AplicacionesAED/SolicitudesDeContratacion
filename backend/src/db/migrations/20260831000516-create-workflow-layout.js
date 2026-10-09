// "Dame acceso a modificar las líneas" (2026-09-02): el canvas de
// WorkflowDiagramaPage.jsx pasa de solo-lectura (posiciones de nodo fijas
// en el código, un drag no se guardaba) a editable -- un admin puede
// arrastrar los nodos para que las líneas no se crucen, y ese acomodo se
// guarda para TODOS los admins (compartido, no por navegador/persona). Una
// fila por categoría; sin fila todavía = usar las posiciones default del
// código (`NODOS_DEF` en el frontend).
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('workflow_layouts', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      categoria: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      posiciones: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      creado_en: { type: Sequelize.DATE, allowNull: false },
      actualizado_en: { type: Sequelize.DATE, allowNull: false },
    });
  },
};
