// Un proveedor/cotización dentro de un CuadroComparativo -- sus porcentajes
// de AIU (administración/imprevisto/utilidad) + IVA sobre utilidad son
// PROPIOS de este proveedor (cada cotización puede traer un AIU distinto),
// no un default global. `seleccionado` marca cuál cotización ganó la
// comparación -- ver cuadroComparativo.js#upsertCuadroComparativo.
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const CuadroComparativoProveedor = sequelize.define(
  'CuadroComparativoProveedor',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cuadro_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    seleccionado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    administracion_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    imprevisto_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    utilidad_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    iva_utilidad_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'cuadro_comparativo_proveedores', underscored: true, timestamps: false }
);

CuadroComparativoProveedor.associate = (models) => {
  CuadroComparativoProveedor.belongsTo(models.CuadroComparativo, { foreignKey: 'cuadro_id' });
};

module.exports = CuadroComparativoProveedor;
