const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ActividadCronograma = sequelize.define(
  'ActividadCronograma',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cronograma_id: { type: DataTypes.INTEGER, allowNull: false },
    fase_id: { type: DataTypes.INTEGER, allowNull: true },
    descripcion: { type: DataTypes.STRING(500), allowNull: false },
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },
    responsable: { type: DataTypes.STRING(200), allowNull: true },
  },
  { tableName: 'actividad_cronogramas', underscored: true, timestamps: false }
);

ActividadCronograma.associate = (models) => {
  ActividadCronograma.belongsTo(models.CronogramaContrato, { foreignKey: 'cronograma_id' });
  ActividadCronograma.belongsTo(models.FaseCronograma, { foreignKey: 'fase_id' });
};

module.exports = ActividadCronograma;
