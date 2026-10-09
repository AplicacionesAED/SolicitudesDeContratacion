'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('solicitudes', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      consecutivo: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      tipo: { type: Sequelize.STRING(40), allowNull: false },
      fecha_solicitud: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },

      solicitante_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
      proyecto_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'proyectos', key: 'id' } },
      frentes_ids: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },

      tercero_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'terceros', key: 'id' } },

      descripcion_actividad: { type: Sequelize.TEXT, allowNull: true },
      plazo_ejecucion: { type: Sequelize.STRING(255), allowNull: true },
      forma_pago: { type: Sequelize.TEXT, allowNull: true },
      valor_final: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
      tipo_contrato: { type: Sequelize.STRING(20), allowNull: true },
      asunto: { type: Sequelize.TEXT, allowNull: true },

      creacion_tercero: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      contratante_nombre: { type: Sequelize.STRING(255), allowNull: true, defaultValue: 'AED CONSTRUCTORES S.A.S' },
      contratante_nit: { type: Sequelize.STRING(30), allowNull: true, defaultValue: '901237628-1' },
      alcance: { type: Sequelize.TEXT, allowNull: true },
      terminos_referencia: { type: Sequelize.TEXT, allowNull: true },
      condiciones_especiales: { type: Sequelize.TEXT, allowNull: true },
      valor_en_letras: { type: Sequelize.STRING(500), allowNull: true },

      doc_terminos_referencia: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      doc_camara_comercio: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      doc_estados_financieros: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      doc_estado_resultados: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      doc_sagrilaft: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      doc_composicion_accionaria: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      doc_rut: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      doc_cedula_representante: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      doc_certificacion_bancaria: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      doc_cotizacion: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },

      archivo_cuadro_comparativo: { type: Sequelize.STRING(500), allowNull: true },
      archivo_cotizacion: { type: Sequelize.STRING(500), allowNull: true },
      archivo_formato_solicitud: { type: Sequelize.STRING(500), allowNull: true },
      archivo_pre_bep: { type: Sequelize.STRING(500), allowNull: true },
      archivo_generador_gastos: { type: Sequelize.STRING(500), allowNull: true },
      archivo_evaluacion_inicial: { type: Sequelize.STRING(500), allowNull: true },
      archivos_anexos: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },

      aprobador_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'usuarios', key: 'id' } },
      fecha_aprobacion_director: { type: Sequelize.DATE, allowNull: true },

      responsable_contratos_tramite_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'usuarios', key: 'id' } },
      responsable_contratos_minuta_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'usuarios', key: 'id' } },
      coordinador_controles_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'usuarios', key: 'id' } },
      director_controles_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'usuarios', key: 'id' } },

      nota_contratacion: { type: Sequelize.TEXT, allowNull: true },
      necesita_revision: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      numero_contrato_adpro: { type: Sequelize.STRING(100), allowNull: true },

      importado_historico: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      numero_otrosi: { type: Sequelize.INTEGER, allowNull: true },

      estado: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'BORRADOR' },

      solicitud_padre_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'solicitudes', key: 'id' } },

      creado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      actualizado_en: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('solicitudes', ['estado']);
    await queryInterface.addIndex('solicitudes', ['solicitante_id']);
    await queryInterface.addIndex('solicitudes', ['solicitud_padre_id']);
  },
};
