// Puerto de `model ActividadUsuario` (schema.prisma).
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ActividadUsuario = sequelize.define(
  'ActividadUsuario',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    // "login" | "logout" | "heartbeat" | "idle" | "active" | "page_view" | "action"
    tipo: { type: DataTypes.STRING(20), allowNull: false },
    descripcion: { type: DataTypes.STRING(255), allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    user_agent: { type: DataTypes.STRING(255), allowNull: true },
  },
  { tableName: 'actividades_usuario', underscored: true, createdAt: 'creado_en', updatedAt: false }
);

ActividadUsuario.associate = (models) => {
  ActividadUsuario.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
};

module.exports = ActividadUsuario;
