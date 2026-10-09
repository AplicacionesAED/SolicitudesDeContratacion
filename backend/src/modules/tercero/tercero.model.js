// Puerto de `model Tercero` (schema.prisma). Los datos de contacto
// (representante legal, correo de firma, etc.) son editables por cualquier
// autenticado vía la ruta PATCH (ver tercero.routes.js); el resto (DD,
// SAGRILAFT, tipo de contrato) requiere el permiso 'editar_terceros' -- ese
// slug NO aparece en FUNCIONALIDADES_DISPONIBLES (utils/permisos.js), así que
// hoy solo ADMIN lo satisface por defecto (bypass total), salvo que se
// conceda como funcionalidad_adicional a un usuario puntual -- mismo
// comportamiento que la app Next.js original.
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Tercero = sequelize.define(
  'Tercero',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    razon_social: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    nit: { type: DataTypes.STRING(30), allowNull: false, defaultValue: '' },
    tipo_contrato: { type: DataTypes.STRING(30), allowNull: false },
    confidencialidad: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

    representante_legal: { type: DataTypes.STRING(200), allowNull: true },
    cedula_representante: { type: DataTypes.STRING(30), allowNull: true },
    correo_firma: { type: DataTypes.STRING(255), allowNull: true },
    direccion_representante: { type: DataTypes.STRING(255), allowNull: true },
    telefono_representante: { type: DataTypes.STRING(30), allowNull: true },
    nombre_contacto: { type: DataTypes.STRING(200), allowNull: true },
    telefono_contacto: { type: DataTypes.STRING(30), allowNull: true },
    correo_contacto: { type: DataTypes.STRING(255), allowNull: true },

    fecha_vencimiento_sagrilaft: { type: DataTypes.DATE, allowNull: true },

    dd_identificacion_contraparte: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    dd_consulta_listas_restrictivas: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    dd_verificacion_pep: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    dd_conocimiento_negocio: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    dd_monitoreo_actualizacion: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    dd_senales_alerta_reporte: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    aprobado_debida_diligencia: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: 'terceros', underscored: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' }
);

Tercero.DD_FIELDS = [
  'dd_identificacion_contraparte',
  'dd_consulta_listas_restrictivas',
  'dd_verificacion_pep',
  'dd_conocimiento_negocio',
  'dd_monitoreo_actualizacion',
  'dd_senales_alerta_reporte',
];

Tercero.associate = (models) => {
  Tercero.belongsToMany(models.Especialidad, { through: models.TerceroEspecialidad, foreignKey: 'tercero_id', otherKey: 'especialidad_id', as: 'especialidades' });
};

module.exports = Tercero;
