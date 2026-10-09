const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const CronogramaContrato = sequelize.define(
  'CronogramaContrato',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    solicitud_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    tiene_fases: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },
  },
  { tableName: 'cronograma_contratos', underscored: true, createdAt: 'creado_en', updatedAt: false }
);

CronogramaContrato.associate = (models) => {
  CronogramaContrato.belongsTo(models.Solicitud, { foreignKey: 'solicitud_id' });
  CronogramaContrato.hasMany(models.FaseCronograma, { foreignKey: 'cronograma_id', as: 'fases' });
  CronogramaContrato.hasMany(models.ActividadCronograma, { foreignKey: 'cronograma_id', as: 'actividades' });
};

module.exports = CronogramaContrato;
