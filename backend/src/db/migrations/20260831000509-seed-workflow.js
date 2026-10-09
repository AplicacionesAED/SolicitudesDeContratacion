// Puebla workflow_pasos (11 filas) y workflow_desvios (1 fila) con los
// mismos valores EXACTOS que TRANSICIONES/el `if` hardcodeado de
// solicitud.estado.js traían en código -- este deploy no cambia ningún
// comportamiento real, solo lo vuelve editable desde /configuracion/workflows.
//
// Es una MIGRACIÓN, no un seeder, a propósito -- mismo criterio que
// 20260831000506-split-permisos-por-categoria.js: en producción
// `entrypoint.sh`/`npm start` solo corren `db:migrate`, NUNCA `db:seed`
// (ver CLAUDE.md), así que sembrar esto como seeder lo dejaría vacío para
// siempre en un deploy real. Idempotente (mismo `SELECT COUNT(*)` que
// cualquier seeder de este proyecto) -- correr esta migración dos veces no
// duplica filas.
'use strict';

const PASOS = [
  { accion: 'ENVIAR', permisos_base: ['crear_enviar_solicitudes'] },
  { accion: 'APROBAR_DIRECTOR_TECNICO', permisos_base: ['aprobar_director_tecnico'] },
  { accion: 'APROBAR_DIRECTOR', permisos_base: ['aprobar_solicitudes_frente'] },
  { accion: 'DEVOLVER', permisos_base: ['aprobar_director_tecnico', 'aprobar_solicitudes_frente', 'revisar_contratos'] },
  { accion: 'REVISAR', permisos_base: ['revisar_contratos'] },
  { accion: 'TRAMITAR_OK', permisos_base: ['revisar_contratos'] },
  { accion: 'AVANZAR_CONTRATOS', permisos_base: ['revisar_contratos'] },
  { accion: 'PASAR_CONTROLES', permisos_base: ['revisar_contratos'] },
  { accion: 'REGISTRAR_ADPRO', permisos_base: ['registrar_adpro'] },
  { accion: 'APROBAR_FINAL', permisos_base: ['aprobacion_final'] },
  { accion: 'REENVIAR', permisos_base: ['crear_enviar_solicitudes'] },
];

module.exports = {
  async up(queryInterface) {
    const ahora = new Date();

    const [pasosExistentes] = await queryInterface.sequelize.query('SELECT COUNT(*)::int AS total FROM workflow_pasos');
    if (pasosExistentes[0].total === 0) {
      await queryInterface.bulkInsert(
        'workflow_pasos',
        PASOS.map((p) => ({ accion: p.accion, permisos_base: JSON.stringify(p.permisos_base), creado_en: ahora, actualizado_en: ahora }))
      );
    }

    const [desviosExistentes] = await queryInterface.sequelize.query('SELECT COUNT(*)::int AS total FROM workflow_desvios');
    if (desviosExistentes[0].total === 0) {
      await queryInterface.bulkInsert('workflow_desvios', [
        {
          accion: 'ENVIAR',
          condicion_rol: 'TECNICA',
          condicion_categoria: 'INDIRECTA',
          estado_destino: 'PENDIENTE_DIRECTOR_TECNICO',
          activo: true,
          creado_en: ahora,
          actualizado_en: ahora,
        },
      ]);
    }
  },
};
