// Puerto de `model ContadorConsecutivo` (schema.prisma) -- `tipo` (la clave
// compuesta `{TIPO_ABREV}-{PROY_ABBR}-{FRENTE_NORMALIZED}`) es la PK.
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ContadorConsecutivo = sequelize.define(
  'ContadorConsecutivo',
  {
    tipo: { type: DataTypes.STRING(100), primaryKey: true, allowNull: false },
    anio: { type: DataTypes.INTEGER, allowNull: false },
    ultimo: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'contador_consecutivos', underscored: true, timestamps: false }
);

module.exports = ContadorConsecutivo;
