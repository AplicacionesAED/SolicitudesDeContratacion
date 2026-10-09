// Adaptado de la plantilla: agrega roles (JSONB array, reemplaza el `rol`
// string único) + funcionalidades_adicionales + cargo/telefono +
// microsoft_id/microsoft_email/ultima_conexion, necesarios para el modelo de
// permisos granular y el SSO de Azure AD de Solicitudes Indirectos.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(200), allowNull: false },
      hashed_password: { type: Sequelize.STRING(255), allowNull: false },
      roles: { type: Sequelize.JSONB, allowNull: false, defaultValue: ['SOLICITANTE'] },
      funcionalidades_adicionales: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      cargo: { type: Sequelize.STRING(150), allowNull: true },
      telefono: { type: Sequelize.STRING(30), allowNull: true },
      microsoft_id: { type: Sequelize.STRING(255), allowNull: true, unique: true },
      microsoft_email: { type: Sequelize.STRING(255), allowNull: true },
      ultima_conexion: { type: Sequelize.DATE, allowNull: true },
      activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      debe_cambiar_password: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      actualizado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
};
