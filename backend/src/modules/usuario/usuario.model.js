// Adaptado de la plantilla -- va en backend/src/modules/usuario/usuario.model.js.
// A diferencia de la plantilla base (un `rol` string único), Solicitudes
// Indirectos necesita permisos GRANULARES por acción: `roles` es un array (un
// usuario puede tener varios, ej. SOLICITANTE+TECNICA) y `funcionalidades_adicionales`
// es un array de slugs concedidos a mano a ESE usuario, por encima de los que
// le da su rol -- ver utils/permisos.js#tienePermiso, puerto literal de
// src/lib/utils.ts (app Next.js original). `microsoft_id`/`microsoft_email`
// habilitan el login SSO de Azure AD (ver modules/auth/auth.azure.js);
// `ultima_conexion` se actualiza en cada login exitoso (password o SSO).
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

// Soft delete: activo=false, nunca se elimina fisicamente.
const Usuario = sequelize.define(
  'Usuario',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    // set() normaliza a minusculas SIEMPRE al guardar -- el login compara
    // case-insensitive (ver auth.service.js#login), asi que el email
    // guardado tiene que ser consistente sin importar como lo haya escrito
    // el usuario al crear la cuenta (mayuscula inicial de autocapitalize,
    // etc.).
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('email', value.toLowerCase());
      },
    },
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    hashed_password: { type: DataTypes.STRING(255), allowNull: false },
    // Array de roles de FUNCIONALIDADES_POR_ROL/tabla Rol (ej. ["TECNICA"],
    // ["DIRECTOR_PROYECTO","TECNICA"], ["ADMIN"]) -- ADMIN es bypass total,
    // no un booleano separado, ver requireAdmin/tienePermiso. `createSchema`
    // exige al menos un rol explícito (usuario.schema.js), así que este
    // default nunca se dispara en la práctica -- se deja vacío (2026-09-18,
    // rol SOLICITANTE eliminado) en vez de apuntar a un rol que ya no existe.
    roles: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    funcionalidades_adicionales: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    cargo: { type: DataTypes.STRING(150), allowNull: true },
    telefono: { type: DataTypes.STRING(30), allowNull: true },
    microsoft_id: { type: DataTypes.STRING(255), allowNull: true, unique: true },
    microsoft_email: { type: DataTypes.STRING(255), allowNull: true },
    ultima_conexion: { type: DataTypes.DATE, allowNull: true },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    debe_cambiar_password: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: 'usuarios', underscored: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' }
);

module.exports = Usuario;
