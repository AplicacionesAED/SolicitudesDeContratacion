const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const FaseCronograma = sequelize.define(
  'FaseCronograma',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cronograma_id: { type: DataTypes.INTEGER, allowNull: false },
    numero_fase: { type: DataTypes.INTEGER, allowNull: false },
    nombre_fase: { type: DataTypes.STRING(200), allowNull: false },
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },
  },
  { tableName: 'fase_cronogramas', underscored: true, timestamps: false }
);

FaseCronograma.associate = (models) => {
  FaseCronograma.belongsTo(models.CronogramaContrato, { foreignKey: 'cronograma_id' });
  FaseCronograma.hasMany(models.ActividadCronograma, { foreignKey: 'fase_id', as: 'actividades' });
};

module.exports = FaseCronograma;
