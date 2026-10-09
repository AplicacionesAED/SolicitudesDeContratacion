// Un ítem presupuestal dentro de un CuadroComparativo. `precios` es un JSONB
// `{ [proveedorId]: valorUnitario }` -- mapa en vez de una 4ª tabla de unión,
// mismo idioma ya usado en este proyecto para "id -> valor"
// (AprobadorFrente, WorkflowLayout.posiciones). `valorTotal` por ítem/
// proveedor (cantidad × valorUnitario) y los totales por proveedor (AIU+IVA)
// NUNCA se guardan acá -- se calculan en el frontend en cada render, mismo
// criterio que valorEnLetras en Solicitud (ver CLAUDE.md).
//
// `cantidad` vs `cantidad_real` (2026-09-09, "la cantidad deben ser
// independiente") -- dos campos DISTINTOS a propósito, fieles a la hoja
// Excel real del cuadro comparativo: `cantidad` es "Pendiente por
// consumir" (lo que aún queda en inventario/presupuesto sin gastar, tabla
// de arriba en CuadroComparativoBuilder.jsx), `cantidad_real` es
// "Cantidades reales" (lo realmente ejecutado, tabla de abajo, la
// duplicada). No están vinculados ni se derivan uno del otro -- cada tabla
// edita el suyo de forma independiente.
//
// `valor_unitario_pendiente` (2026-09-09) -- el "VR. Unit" de "Pendiente
// por consumir", fiel a la hoja Excel real. Es el ÚNICO precio unitario
// nuevo que se guarda acá -- "V. Total" (de Pendiente) y "V. Total según
// PPTO" (de Cantidades reales) NUNCA se guardan, se calculan en el
// frontend: V. Total = cantidad × valorUnitarioPendiente; V. Total según
// PPTO = cantidadReal × valorUnitarioPendiente (reutiliza el MISMO precio
// unitario presupuestado -- "Cantidades reales" no tiene su propio VR.
// Unit, según la hoja Excel real que compartió el usuario).
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const CuadroComparativoItem = sequelize.define(
  'CuadroComparativoItem',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cuadro_id: { type: DataTypes.INTEGER, allowNull: false },
    codigo_item: { type: DataTypes.STRING(50), allowNull: true },
    codigo_insumo: { type: DataTypes.STRING(50), allowNull: true },
    actividad: { type: DataTypes.STRING(300), allowNull: false },
    alcance: { type: DataTypes.STRING(300), allowNull: true },
    unidad: { type: DataTypes.STRING(30), allowNull: true },
    cantidad: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    cantidad_real: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    valor_unitario_pendiente: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    precios: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'cuadro_comparativo_items', underscored: true, timestamps: false }
);

CuadroComparativoItem.associate = (models) => {
  CuadroComparativoItem.belongsTo(models.CuadroComparativo, { foreignKey: 'cuadro_id' });
};

module.exports = CuadroComparativoItem;
