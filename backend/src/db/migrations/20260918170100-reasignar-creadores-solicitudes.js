'use strict';

// Instrucción de negocio (2026-09-18): "ya no necesitamos el rol de
// Solicitante, en indirectos los que crean las solicitudes son los
// coordinadores de técnica y directores de proyecto, y en directos los que
// solicitan son los residentes administrativos y residentes de obra".
// Confirmado con el usuario, decisión por decisión:
//
// - Indirecta: crear_solicitudes_indirectas queda exclusivo de
//   Coordinador de Técnica (codigo TECNICA) y Director de Proyecto -- se
//   quita a Contratos, Coordinador de Controles, Director de Controles y
//   Director Técnico (los 4 lo tenían activo hoy).
// - Directa: crear_solicitudes_directas se quita solo a Contratos y
//   Director de Controles -- Coordinador de Controles y Director de
//   Proyecto lo CONSERVAN (pedido explícito del usuario, no exclusivo como
//   en Indirecta). Se agrega a Residente Administrativo (antes solo podía
//   ver, nunca crear).
// - El rol Solicitante se elimina por completo más abajo (los 5 usuarios
//   reales que lo tenían ya tienen también Director de Proyecto, así que no
//   pierden ningún acceso real).
//
// Se matchea por `codigo` (identificador estable, ver
// 20260918150000-add-codigo-a-roles.js) en vez de `nombre` -- varios de
// estos roles ya fueron renombrados a un nombre humano por el admin.
module.exports = {
  async up(queryInterface, Sequelize) {
    const { Op } = Sequelize;

    async function quitarPermiso(codigo, permiso) {
      const [rows] = await queryInterface.sequelize.query(
        'SELECT id, permisos FROM roles WHERE codigo = :codigo',
        { replacements: { codigo } }
      );
      if (rows.length === 0) return;
      const permisos = (rows[0].permisos ?? []).filter((p) => p !== permiso);
      await queryInterface.sequelize.query('UPDATE roles SET permisos = :permisos WHERE id = :id', {
        replacements: { permisos: JSON.stringify(permisos), id: rows[0].id },
      });
    }

    async function agregarPermiso(codigo, permiso) {
      const [rows] = await queryInterface.sequelize.query(
        'SELECT id, permisos FROM roles WHERE codigo = :codigo',
        { replacements: { codigo } }
      );
      if (rows.length === 0) return;
      const permisos = rows[0].permisos ?? [];
      if (permisos.includes(permiso)) return;
      await queryInterface.sequelize.query('UPDATE roles SET permisos = :permisos WHERE id = :id', {
        replacements: { permisos: JSON.stringify([...permisos, permiso]), id: rows[0].id },
      });
    }

    // Indirecta: exclusiva a TECNICA + DIRECTOR_PROYECTO.
    await quitarPermiso('CONTRATOS', 'crear_solicitudes_indirectas');
    await quitarPermiso('CONTROLES', 'crear_solicitudes_indirectas');
    await quitarPermiso('DIRECTOR_CONTROLES', 'crear_solicitudes_indirectas');
    await quitarPermiso('DIRECTOR_TECNICO', 'crear_solicitudes_indirectas');

    // Directa: se quita solo a CONTRATOS y DIRECTOR_CONTROLES -- CONTROLES y
    // DIRECTOR_PROYECTO lo conservan a propósito.
    await quitarPermiso('CONTRATOS', 'crear_solicitudes_directas');
    await quitarPermiso('DIRECTOR_CONTROLES', 'crear_solicitudes_directas');

    // Residente Administrativo pasa de "solo ver" a poder crear Directas +
    // ver terceros (para elegir contratista al armar la solicitud).
    await agregarPermiso('RESIDENTE_ADMINISTRATIVO', 'crear_solicitudes_directas');
    await agregarPermiso('RESIDENTE_ADMINISTRATIVO', 'ver_terceros');

    // Eliminar el rol Solicitante por completo -- los usuarios reales que lo
    // tenían (todos con Director de Proyecto también) simplemente pierden
    // ese elemento del array `roles`, sin perder acceso real.
    await queryInterface.sequelize.query(`
      UPDATE usuarios
      SET roles = (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        FROM jsonb_array_elements(roles) elem
        WHERE elem <> '"SOLICITANTE"'::jsonb
      )
      WHERE roles @> '["SOLICITANTE"]'::jsonb
    `);
    await queryInterface.sequelize.query("DELETE FROM roles WHERE codigo = 'SOLICITANTE' OR nombre = 'SOLICITANTE'");
  },
};
