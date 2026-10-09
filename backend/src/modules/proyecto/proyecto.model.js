// Puerto de `model Proyecto` (schema.prisma). `codigo_consecutivo` sobreescribe
// el código corto generado automáticamente para el consecutivo de Solicitud
// (ej. "BAI") cuando está presente -- ver la Fase 4 (solicitud.consecutivo.js).
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Proyecto = sequelize.define(
  'Proyecto',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    codigo_consecutivo: { type: DataTypes.STRING(20), allowNull: true },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: 'proyectos', underscored: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' }
);

Proyecto.associate = (models) => {
  Proyecto.hasMany(models.Frente, { foreignKey: 'proyecto_id', as: 'frentes' });
};

module.exports = Proyecto;
