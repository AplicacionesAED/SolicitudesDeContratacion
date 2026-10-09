'use strict';

// Flujo propio de Directa (Orden de Servicio), 2026-09-18 -- confirmado con
// el usuario: "Director de Obra" es un rol NUEVO y DISTINTO de
// "Director de Proyecto" (dos personas/slots separados posibles por
// frente), no una simple etiqueta alternativa del mismo rol. Aprueba la
// solicitud viendo los valores claros -- ver
// solicitud.autorizacion.js#ACCION_SLOT_FIJO_DIRECTA.
//
// Mismo criterio que 20260918130200-seed-rol-residente-administrativo.js:
// migración (no seeder), idempotente por nombre EXACTO ("Director de
// Obra", nombre humano elegido por el negocio, no una constante
// SNAKE_CASE).
module.exports = {
  async up(queryInterface) {
    const [existentes] = await queryInterface.sequelize.query(
      "SELECT COUNT(*)::int AS total FROM roles WHERE nombre = 'Director de Obra'"
    );
    if (existentes[0].total > 0) return;

    const ahora = new Date();
    await queryInterface.bulkInsert('roles', [
      {
        nombre: 'Director de Obra',
        permisos: JSON.stringify(['ver_solicitudes_directas', 'ver_terceros', 'ver_especialidades']),
        alcance_solicitudes: 'FRENTE',
        creado_en: ahora,
        actualizado_en: ahora,
      },
    ]);
  },
};
