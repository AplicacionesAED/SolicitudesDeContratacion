'use strict';

// 2026-09-18: "renombrar un rol no debe romper nada que dependa de él" --
// el mismo problema que ya se resolvió puntualmente para ADMIN
// (roles.es_admin, un flag ligado a la fila -- ver
// 20260918120000-roles-add-es-admin.js) generalizado: el backend tenía
// (y en parte sigue teniendo, ver la auditoría de esta fecha en CLAUDE.md)
// decenas de comparaciones `usuario.roles.includes('CONTROLES')` contra el
// nombre ORIGINAL de un rol -- si un admin lo renombra desde
// /configuracion/roles (ya soportado), esas comparaciones dejan de
// matchear en silencio para cualquier usuario con ese rol.
//
// `codigo` es un identificador ESTABLE, nunca editable desde la UI (no
// existe en rol.schema.js), que el código de negocio puede usar para
// resolver el NOMBRE ACTUAL de un rol antes de comparar contra
// `usuario.roles` -- ver utils/permisos.js#getRolesPorCodigo().
//
// El backfill genérico de acá cubre CUALQUIER entorno donde estos roles
// todavía tengan su nombre ORIGINAL (un deploy fresco, o esta misma base
// antes de que se empezaran a renombrar roles) -- compara por `nombre`
// actual, no por id, así que es seguro correrlo en cualquier lado. Los
// roles que YA fueron renombrados en la base real de dev ANTES de que esta
// columna existiera (Contratos, Coordinador de Controles, Director de
// Controles, Administrador) no matchean este UPDATE genérico -- se
// reconciliaron aparte, a mano, contra el estado real ya inspeccionado de
// esa base puntual (no tendría sentido "adivinar" ese mapeo id->código
// dentro de una migración pensada para correr en cualquier entorno).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('roles', 'codigo', {
      type: Sequelize.STRING(30),
      allowNull: true,
      unique: true,
    });

    const codigosOriginales = ['SOLICITANTE', 'TECNICA', 'DIRECTOR_TECNICO', 'DIRECTOR_PROYECTO', 'CONTRATOS', 'CONTROLES', 'DIRECTOR_CONTROLES', 'GERENCIA', 'ADMIN'];
    for (const codigo of codigosOriginales) {
      await queryInterface.sequelize.query('UPDATE roles SET codigo = :codigo WHERE nombre = :codigo AND codigo IS NULL', {
        replacements: { codigo },
      });
    }
  },
};
