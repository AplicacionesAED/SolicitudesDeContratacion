// Definición de UNA columna de la tabla de Memoria -- `tipo` decide cómo se
// interpreta el `valor` de esa columna en cada MemoriaFila.valores (ver el
// comentario grande en memoriaFila.model.js). La columna con `orden = 0`
// es SIEMPRE 'IMAGEN' -- garantizado por el frontend (MemoriaBuilder.jsx),
// no hay constraint especial acá.
//
// 'CALCULADA' es la única que necesita `formula_*` -- sus dos operandos
// (`formula_columna_a_id`/`formula_columna_b_id`) SOLO pueden apuntar a
// columnas 'ENTERO'/'FLOAT' (nunca a otra 'CALCULADA') -- restricción a
// propósito para no tener que detectar ciclos, decidida con el usuario al
// planear esto. El valor de una columna calculada NUNCA se guarda -- se
// calcula en el frontend a partir de los valores reales de sus 2 columnas
// operando en esa misma fila (MemoriaBuilder.jsx#calcularValorCalculada).
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const MemoriaColumna = sequelize.define(
  'MemoriaColumna',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    memoria_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    tipo: { type: DataTypes.STRING(20), allowNull: false },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    formula_columna_a_id: { type: DataTypes.INTEGER, allowNull: true },
    formula_operador: { type: DataTypes.STRING(1), allowNull: true },
    formula_columna_b_id: { type: DataTypes.INTEGER, allowNull: true },
    mostrar_total: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: 'memoria_columnas', underscored: true, timestamps: false }
);

MemoriaColumna.associate = (models) => {
  MemoriaColumna.belongsTo(models.Memoria, { foreignKey: 'memoria_id' });
  MemoriaColumna.belongsTo(models.MemoriaColumna, { foreignKey: 'formula_columna_a_id', as: 'formulaColumnaA' });
  MemoriaColumna.belongsTo(models.MemoriaColumna, { foreignKey: 'formula_columna_b_id', as: 'formulaColumnaB' });
};

module.exports = MemoriaColumna;
