// Puerto de `model Notificacion` (schema.prisma).
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Notificacion = sequelize.define(
  'Notificacion',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    titulo: { type: DataTypes.STRING(200), allowNull: false },
    mensaje: { type: DataTypes.TEXT, allowNull: false },
    leida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    url: { type: DataTypes.STRING(255), allowNull: true },
  },
  { tableName: 'notificaciones', underscored: true, createdAt: 'creado_en', updatedAt: false }
);

Notificacion.associate = (models) => {
  Notificacion.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
};

module.exports = Notificacion;
