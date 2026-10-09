'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('terceros', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      razon_social: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      nit: { type: Sequelize.STRING(30), allowNull: false, defaultValue: '' },
      tipo_contrato: { type: Sequelize.STRING(30), allowNull: false },
      confidencialidad: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },

      representante_legal: { type: Sequelize.STRING(200), allowNull: true },
      cedula_representante: { type: Sequelize.STRING(30), allowNull: true },
      correo_firma: { type: Sequelize.STRING(255), allowNull: true },
      direccion_representante: { type: Sequelize.STRING(255), allowNull: true },
      telefono_representante: { type: Sequelize.STRING(30), allowNull: true },
      nombre_contacto: { type: Sequelize.STRING(200), allowNull: true },
      telefono_contacto: { type: Sequelize.STRING(30), allowNull: true },
      correo_contacto: { type: Sequelize.STRING(255), allowNull: true },

      fecha_vencimiento_sagrilaft: { type: Sequelize.DATE, allowNull: true },

      dd_identificacion_contraparte: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      dd_consulta_listas_restrictivas: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      dd_verificacion_pep: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      dd_conocimiento_negocio: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      dd_monitoreo_actualizacion: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      dd_senales_alerta_reporte: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      aprobado_debida_diligencia: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },

      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      actualizado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
};
