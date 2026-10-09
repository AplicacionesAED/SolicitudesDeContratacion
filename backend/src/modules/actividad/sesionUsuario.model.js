// Puerto de `model SesionUsuario` (schema.prisma).
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const SesionUsuario = sequelize.define(
  'SesionUsuario',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    inicio: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    fin: { type: DataTypes.DATE, allowNull: true },
    duracion_seg: { type: DataTypes.INTEGER, allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    user_agent: { type: DataTypes.STRING(255), allowNull: true },
    // "desktop" | "mobile" | "tablet"
    dispositivo: { type: DataTypes.STRING(20), allowNull: true },
    navegador: { type: DataTypes.STRING(30), allowNull: true },
    sistema_op: { type: DataTypes.STRING(30), allowNull: true },
  },
  { tableName: 'sesiones_usuario', underscored: true, timestamps: false }
);

SesionUsuario.associate = (models) => {
  SesionUsuario.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
};

module.exports = SesionUsuario;
