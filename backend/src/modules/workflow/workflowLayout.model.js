// Guarda el acomodo manual del canvas de WorkflowDiagramaPage.jsx por
// categoría -- una fila por categoría (DIRECTA/INDIRECTA), `posiciones` es
// `{ nodos: { [idDeEstado]: {x,y} }, aristas: { [idDeArista]: {centerX,
// centerY} } }` -- ver workflow.schema.js#layoutSchema para el detalle de
// cada forma. Compartido entre todos los admins (no es un ajuste personal
// por navegador) -- 2026-09-02, "dame acceso a modificar las líneas"/
// "¿puedo mover las líneas también?" -- el admin que reordena el canvas
// para que no se crucen las líneas quiere que cualquier otro admin vea el
// mismo acomodo, no uno por persona.
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const WorkflowLayout = sequelize.define(
  'WorkflowLayout',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    categoria: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    posiciones: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  },
  { tableName: 'workflow_layouts', underscored: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' }
);

module.exports = WorkflowLayout;
