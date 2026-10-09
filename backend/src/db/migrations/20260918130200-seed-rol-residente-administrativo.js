'use strict';

// Flujo propio de Directa (Orden de Servicio), 2026-09-18 -- rol nuevo
// "Residente Administrativo" (coloca la Minuta de Adpro, reemplaza a
// Controles en ese paso para Directa -- ver solicitud.autorizacion.js).
// Es una MIGRACIÓN, no un seeder, a propósito -- mismo criterio que
// 20260831000003-seed-roles.js/20260831000509-seed-workflow.js: en
// producción solo corre `db:migrate`, nunca `db:seed`. Idempotente por
// `nombre` (si un admin se adelanta y ya lo creó a mano desde
// /configuracion/roles -- ya soporta crear roles -- esto no duplica).
//
// El nombre EXACTO ("Residente Administrativo", no una constante
// SNAKE_CASE) importa -- a diferencia de los roles originales del scaffold
// (SOLICITANTE, CONTROLES, etc.), este es un rol nuevo creado por el
// negocio directamente con nombre humano desde la UI de Roles; el filtro
// `rol` de FrenteDetallePage.jsx#SLOTS y cualquier chequeo
// `usuario.roles.includes(...)` tienen que usar este mismo string.
//
// `permisos` por defecto: solo VER Directas (necesita navegar el listado
// para actuar sobre lo que tiene asignado vía AprobadorFrente, mismo
// criterio que CONTRATOS/CONTROLES hoy) + ver Terceros/Especialidades --
// sin `crear_solicitudes_directas`, este rol no genera solicitudes nuevas.
// Editable después desde /configuracion/roles como cualquier otro.
module.exports = {
  async up(queryInterface) {
    const [existentes] = await queryInterface.sequelize.query(
      "SELECT COUNT(*)::int AS total FROM roles WHERE nombre = 'Residente Administrativo'"
    );
    if (existentes[0].total > 0) return;

    const ahora = new Date();
    await queryInterface.bulkInsert('roles', [
      {
        nombre: 'Residente Administrativo',
        permisos: JSON.stringify(['ver_solicitudes_directas', 'ver_terceros', 'ver_especialidades']),
        alcance_solicitudes: 'FRENTE',
        creado_en: ahora,
        actualizado_en: ahora,
      },
    ]);
  },
};
