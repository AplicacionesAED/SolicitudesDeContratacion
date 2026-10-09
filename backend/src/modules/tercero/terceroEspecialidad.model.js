// Tabla puente Tercero<->Especialidad (relación implícita m:n
// "TerceroEspecialidades" en schema.prisma) -- explícita acá, mismo criterio
// que FrenteUsuario.
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const TerceroEspecialidad = sequelize.define(
  'TerceroEspecialidad',
  {
    tercero_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    especialidad_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  },
  { tableName: 'tercero_especialidades', underscored: true, timestamps: false }
);

module.exports = TerceroEspecialidad;
