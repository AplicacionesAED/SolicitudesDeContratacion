'use strict';

// Flujo propio de Directa, 2026-10-09 -- rol nuevo "Gerente de Compras"
// (aprueba el último paso del flujo, después de Director/a de Controles).
// Migración, no seeder, mismo criterio que
// 20260918140000-seed-rol-director-obra.js: en producción solo corre
// `db:migrate`, nunca `db:seed`. Idempotente por `nombre`.
//
// `permisos` por defecto: solo VER Directas (necesita navegar el listado
// para actuar sobre lo que tiene asignado vía AprobadorFrente, mismo
// criterio que Director de Obra/Residente Administrativo) + ver Terceros/
// Especialidades -- sin `crear_solicitudes_directas`, este rol no genera
// solicitudes nuevas.
module.exports = {
  async up(queryInterface) {
    const [existentes] = await queryInterface.sequelize.query("SELECT COUNT(*)::int AS total FROM roles WHERE nombre = 'Gerente de Compras'");
    if (existentes[0].total > 0) return;

    const ahora = new Date();
    await queryInterface.bulkInsert('roles', [
      {
        nombre: 'Gerente de Compras',
        permisos: JSON.stringify(['ver_solicitudes_directas', 'ver_terceros', 'ver_especialidades']),
        alcance_solicitudes: 'FRENTE',
        creado_en: ahora,
        actualizado_en: ahora,
      },
    ]);
  },
};
