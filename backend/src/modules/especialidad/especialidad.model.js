// Puerto de `model Especialidad` (schema.prisma).
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Especialidad = sequelize.define(
  'Especialidad',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    descripcion: { type: DataTypes.STRING(500), allowNull: true },
  },
  { tableName: 'especialidades', underscored: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' }
);

Especialidad.associate = (models) => {
  Especialidad.belongsToMany(models.Tercero, { through: models.TerceroEspecialidad, foreignKey: 'especialidad_id', otherKey: 'tercero_id', as: 'terceros' });
};

module.exports = Especialidad;
