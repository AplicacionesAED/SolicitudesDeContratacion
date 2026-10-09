// Una fila de la tabla de Memoria. `valores` es un JSONB `{ [columnaId]:
// valor }` -- mapa en vez de una 4ª tabla de unión, mismo idioma ya usado
// en este proyecto para "id -> valor" (AprobadorFrente,
// WorkflowLayout.posiciones, CuadroComparativoItem.precios). Forma de
// `valor` según el `tipo` de esa columna (MemoriaColumna.tipo):
//   TEXTO          -> string
//   ENTERO/FLOAT   -> number
//   FECHA          -> "YYYY-MM-DD"
//   RANGO_FECHAS   -> { inicio: "YYYY-MM-DD", fin: "YYYY-MM-DD" }
//   IMAGEN         -> { url, nombre } (mismo shape que Solicitud.archivosAnexos)
//   CALCULADA      -> nunca tiene entrada acá, se calcula en el frontend
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const MemoriaFila = sequelize.define(
  'MemoriaFila',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    memoria_id: { type: DataTypes.INTEGER, allowNull: false },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    valores: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  },
  { tableName: 'memoria_filas', underscored: true, timestamps: false }
);

MemoriaFila.associate = (models) => {
  MemoriaFila.belongsTo(models.Memoria, { foreignKey: 'memoria_id' });
};

module.exports = MemoriaFila;
