// Padre 1:1 con Solicitud -- mismo patrón que CuadroComparativo (un
// borra-y-recrea transaccional entero en cada guardado, ver memoria.js).
// Solo para categoria='DIRECTA' por ahora (gateado en el frontend,
// SolicitudForm.jsx -- este modelo no lo restringe, nada impide guardarlo
// para una INDIRECTA si algún día se habilita ahí también).
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Memoria = sequelize.define(
  'Memoria',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    solicitud_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    titulo: { type: DataTypes.STRING(300), allowNull: true },
    // Tabla pegada desde Excel (HTML ya limpio). Las memorias viejas usan columnas/filas y lo dejan en null.
    contenido_html: { type: DataTypes.TEXT, allowNull: true },
    // Hasta 3 imágenes de apoyo: lista de URLs `/files/drive/<id>`.
    imagenes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  },
  { tableName: 'memorias', underscored: true, createdAt: 'creado_en', updatedAt: false }
);

Memoria.associate = (models) => {
  Memoria.belongsTo(models.Solicitud, { foreignKey: 'solicitud_id' });
  Memoria.hasMany(models.MemoriaColumna, { foreignKey: 'memoria_id', as: 'columnas' });
  Memoria.hasMany(models.MemoriaFila, { foreignKey: 'memoria_id', as: 'filas' });
};

module.exports = Memoria;
