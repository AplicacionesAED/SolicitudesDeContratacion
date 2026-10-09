'use strict';

// Flujo propio de Directa (Orden de Servicio), 2026-09-18 -- "Contratos
// confirma que la solicitud se recibió completa" pasa a ir DESPUÉS de
// "Controles realiza proyección", en vez de justo después de la
// aprobación del Director como hoy. Esto se resuelve 100% con el
// mecanismo de desvíos condicionales que ya existe (workflow_desvios,
// usado hoy para el desvío ENVIAR->PENDIENTE_DIRECTOR_TECNICO) -- sin
// tocar la resolución de estado_destino en código: una Directa que
// ejecuta APROBAR_DIRECTOR cae acá en EN_PROYECCION_CONTROLES en vez del
// default EN_TRAMITE_CONTRATOS (que Indirecta sigue usando sin cambios).
// Mismo patrón idempotente que 20260831000509-seed-workflow.js -- pero
// chequea por ESTA fila puntual, no por "la tabla está vacía" (ya tiene
// la fila de ENVIAR/TECNICA/INDIRECTA sembrada desde esa migración).
module.exports = {
  async up(queryInterface) {
    const [existentes] = await queryInterface.sequelize.query(
      "SELECT COUNT(*)::int AS total FROM workflow_desvios WHERE accion = 'APROBAR_DIRECTOR' AND condicion_categoria = 'DIRECTA'"
    );
    if (existentes[0].total > 0) return;

    const ahora = new Date();
    await queryInterface.bulkInsert('workflow_desvios', [
      {
        accion: 'APROBAR_DIRECTOR',
        condicion_rol: null,
        condicion_categoria: 'DIRECTA',
        estado_destino: 'EN_PROYECCION_CONTROLES',
        activo: true,
        creado_en: ahora,
        actualizado_en: ahora,
      },
    ]);
  },
};
