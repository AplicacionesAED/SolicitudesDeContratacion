'use strict';

// Flujo propio de Directa, 2026-10-09 -- "después de la Aprobación Final va
// a aprobar otra persona: nuevo paso de Gerente de Compras (último)". Se
// resuelve 100% con el mecanismo de desvíos condicionales que ya existe
// (workflow_desvios) -- APROBAR_FINAL sigue yendo a COMPLETADA por default
// (INDIRECTA, sin cambios), pero para DIRECTA cae acá, a
// PENDIENTE_GERENTE_COMPRAS, un paso más antes de completarse. Mismo patrón
// idempotente que 20260918130300-seed-desvio-aprobar-director-directa.js.
module.exports = {
  async up(queryInterface) {
    const [existentes] = await queryInterface.sequelize.query(
      "SELECT COUNT(*)::int AS total FROM workflow_desvios WHERE accion = 'APROBAR_FINAL' AND condicion_categoria = 'DIRECTA'"
    );
    if (existentes[0].total > 0) return;

    const ahora = new Date();
    await queryInterface.bulkInsert('workflow_desvios', [
      {
        accion: 'APROBAR_FINAL',
        condicion_rol: null,
        condicion_categoria: 'DIRECTA',
        estado_destino: 'PENDIENTE_GERENTE_COMPRAS',
        activo: true,
        creado_en: ahora,
        actualizado_en: ahora,
      },
    ]);
  },
};
