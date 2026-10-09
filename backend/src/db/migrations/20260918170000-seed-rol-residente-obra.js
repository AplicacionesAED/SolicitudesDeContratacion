'use strict';

// "Ya no necesitamos el rol de Solicitante... en directos los que solicitan
// son los residentes administrativos y residentes de obra" (2026-09-18).
// Confirmado con el usuario: "Residente de Obra" es un rol NUEVO y DISTINTO
// de "Director de Obra" (que aprueba la solicitud, ver
// 20260918140000-seed-rol-director-obra.js) -- evita que la misma persona/
// rol se autoapruebe. Mismo criterio de idempotencia por nombre humano
// exacto que esa migración, pero esta ya puede setear `codigo` directo
// (la columna ya existe para este punto, ver
// 20260918150000-add-codigo-a-roles.js).
module.exports = {
  async up(queryInterface) {
    const [existentes] = await queryInterface.sequelize.query(
      "SELECT COUNT(*)::int AS total FROM roles WHERE codigo = 'RESIDENTE_OBRA' OR nombre = 'Residente de Obra'"
    );
    if (existentes[0].total > 0) return;

    const ahora = new Date();
    await queryInterface.bulkInsert('roles', [
      {
        nombre: 'Residente de Obra',
        codigo: 'RESIDENTE_OBRA',
        // Mismo set que Residente Administrativo tras este cambio: crea
        // solicitudes Directas + ve terceros para poder elegir contratista.
        permisos: JSON.stringify(['crear_solicitudes_directas', 'ver_solicitudes_directas', 'ver_terceros']),
        alcance_solicitudes: 'FRENTE',
        creado_en: ahora,
        actualizado_en: ahora,
      },
    ]);
  },
};
