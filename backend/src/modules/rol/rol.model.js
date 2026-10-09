// Nuevo -- no viene en la plantilla base. Tabla editable en runtime (admin,
// ver /configuracion/roles) que reemplaza el FUNCIONALIDADES_POR_ROL
// hardcodeado de la app Next.js original como fuente de permisos -- ese mapa
// sigue viviendo como FALLBACK en utils/permisos.js si esta tabla está vacía.
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Rol = sequelize.define(
  'Rol',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(30), allowNull: false, unique: true }, // ej. "SOLICITANTE", "ADMIN"
    // Array de slugs de FUNCIONALIDADES_DISPONIBLES (utils/permisos.js) --
    // ver tienePermiso().
    permisos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    // Alcance de VISIBILIDAD de un usuario con este rol dentro de una
    // sección de Solicitudes a la que ya tiene acceso (ver
    // `ver_solicitudes_directas`/`_indirectas` en FUNCIONALIDADES_DISPONIBLES
    // -- esto es un eje totalmente aparte, "cuáles filas ve" vs "puede
    // entrar a la sección"): 'PROPIAS' (solo lo que creó), 'FRENTE' (propias
    // + donde es responsable en algún paso + lo de sus frentes asignados) o
    // 'TODAS' -- ver getRolesAlcanceSolicitudes()/resolverAlcanceSolicitudes()
    // en utils/permisos.js.
    alcance_solicitudes: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'FRENTE' },
    // Flag interno, ligado a la fila (id) -- NO al nombre. Pedido explicito
    // del usuario (2026-09-18): poder renombrar ADMIN sin romper el acceso
    // de administrador (mas de 15 lugares del backend comparaban el string
    // literal 'ADMIN'). Sembrado una sola vez por migracion, nunca expuesto
    // en rol.schema.js -- no es algo que se deba poder marcar/desmarcar
    // desde la UI de Roles.
    es_admin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Identificador ESTABLE, independiente de `nombre` (2026-09-18, mismo
    // motivo que es_admin: renombrar un rol no debe romper nada que
    // dependa de reconocerlo). NUNCA expuesto en rol.schema.js -- no es
    // editable desde la UI, se siembra solo para los roles que el código
    // necesita reconocer por negocio (ver utils/permisos.js#getRolesPorCodigo).
    codigo: { type: DataTypes.STRING(30), allowNull: true, unique: true },
  },
  { tableName: 'roles', underscored: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' }
);

module.exports = Rol;
