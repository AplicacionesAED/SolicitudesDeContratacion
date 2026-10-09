// Padre 1:1 con Solicitud -- mismo patrón que CronogramaContrato (un borra-y-
// recrea transaccional entero en cada guardado, ver cuadroComparativo.js).
// Sin columnas propias más allá del id: a diferencia del cronograma (que sí
// tiene fecha_inicio/fecha_fin a nivel de cabecera), acá no hay ningún dato
// "de cuadro" -- solo agrupa proveedores/items y le da a
// Solicitud.hasOne(...) un id estable para el include.
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const CuadroComparativo = sequelize.define(
  'CuadroComparativo',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    solicitud_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  },
  { tableName: 'cuadros_comparativos', underscored: true, createdAt: 'creado_en', updatedAt: false }
);

CuadroComparativo.associate = (models) => {
  CuadroComparativo.belongsTo(models.Solicitud, { foreignKey: 'solicitud_id' });
  CuadroComparativo.hasMany(models.CuadroComparativoProveedor, { foreignKey: 'cuadro_id', as: 'proveedores' });
  CuadroComparativo.hasMany(models.CuadroComparativoItem, { foreignKey: 'cuadro_id', as: 'items' });
};

module.exports = CuadroComparativo;
