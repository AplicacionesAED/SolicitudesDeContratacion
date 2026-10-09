const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const HistorialSolicitud = sequelize.define(
  'HistorialSolicitud',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    solicitud_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    accion: { type: DataTypes.STRING(60), allowNull: false },
    nota: { type: DataTypes.TEXT, allowNull: true },
    // Estado real al que quedó la solicitud tras esta acción, YA con
    // cualquier desvío condicional aplicado (`workflow_desvios`) -- nunca
    // recalcular esto a partir de `accion` a secas, ver el comentario de la
    // migración `20260918160000-add-estado-resultante-historial.js`.
    estado_resultante: { type: DataTypes.STRING(40), allowNull: true },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { tableName: 'historial_solicitudes', underscored: true, timestamps: false }
);

HistorialSolicitud.associate = (models) => {
  HistorialSolicitud.belongsTo(models.Solicitud, { foreignKey: 'solicitud_id' });
  HistorialSolicitud.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
};

module.exports = HistorialSolicitud;
