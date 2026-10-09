// Módulo Workflows -- desvíos condicionales por acción (0 o más). Reemplaza
// el `if` hardcodeado que decidía el desvío ENVIAR -> PENDIENTE_DIRECTOR_TECNICO
// (rol TECNICA + categoría INDIRECTA) en solicitud.estado.js.
// condicion_rol/condicion_categoria NULL = "cualquiera" (sin esa condición);
// ambas se evalúan con AND dentro de una fila.
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const WorkflowDesvio = sequelize.define(
  'WorkflowDesvio',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    accion: { type: DataTypes.STRING(40), allowNull: false },
    condicion_rol: { type: DataTypes.STRING(30), allowNull: true },
    condicion_categoria: { type: DataTypes.STRING(20), allowNull: true },
    estado_destino: { type: DataTypes.STRING(40), allowNull: false },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: 'workflow_desvios', underscored: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' }
);

module.exports = WorkflowDesvio;
