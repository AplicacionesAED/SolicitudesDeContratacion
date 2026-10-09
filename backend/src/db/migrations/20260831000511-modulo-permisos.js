// "Eliminar permisos de rol para solicitudes" (2026-09-02): los 16 slugs
// _directa/_indirecta de crear/aprobar solicitudes se retiran, reemplazados
// por 2 permisos de módulo (modulo_solicitudes_directas/indirectas -- solo
// cubren CREAR, ya que aprobar pasó a depender 100% de AprobadorFrente, ver
// 20260831000510-reshape-aprobador-frente.js). Por cada fila real de
// `roles.permisos`/`usuarios.funcionalidades_adicionales`: si tiene
// cualquiera de los 8 slugs `_directa`, agrega `modulo_solicitudes_directas`
// (nadie pierde acceso el día del deploy); ídem `_indirecta`. Después quita
// los 16 slugs viejos. Migración de datos, no seeder -- mismo criterio que
// 20260831000506-split-permisos-por-categoria.js (producción solo corre
// `db:migrate`).
'use strict';

const SLUGS_VIEJOS_DIRECTA = [
  'crear_enviar_solicitudes_directa',
  'crear_otrosi_directa',
  'crear_solicitudes_diseno_directa',
  'aprobar_director_tecnico_directa',
  'aprobar_solicitudes_frente_directa',
  'revisar_contratos_directa',
  'registrar_adpro_directa',
  'aprobacion_final_directa',
];

const SLUGS_VIEJOS_INDIRECTA = [
  'crear_enviar_solicitudes_indirecta',
  'crear_otrosi_indirecta',
  'crear_solicitudes_diseno_indirecta',
  'aprobar_director_tecnico_indirecta',
  'aprobar_solicitudes_frente_indirecta',
  'revisar_contratos_indirecta',
  'registrar_adpro_indirecta',
  'aprobacion_final_indirecta',
];

const TODOS_LOS_SLUGS_VIEJOS = [...SLUGS_VIEJOS_DIRECTA, ...SLUGS_VIEJOS_INDIRECTA];

function migrarSlugs(slugs) {
  const resultado = (slugs ?? []).filter((s) => !TODOS_LOS_SLUGS_VIEJOS.includes(s));
  const teniaDirecta = (slugs ?? []).some((s) => SLUGS_VIEJOS_DIRECTA.includes(s));
  const teniaIndirecta = (slugs ?? []).some((s) => SLUGS_VIEJOS_INDIRECTA.includes(s));
  if (teniaDirecta && !resultado.includes('modulo_solicitudes_directas')) resultado.push('modulo_solicitudes_directas');
  if (teniaIndirecta && !resultado.includes('modulo_solicitudes_indirectas')) resultado.push('modulo_solicitudes_indirectas');
  return resultado;
}

module.exports = {
  async up(queryInterface) {
    const [roles] = await queryInterface.sequelize.query('SELECT id, permisos FROM roles');
    for (const rol of roles) {
      const nuevos = migrarSlugs(rol.permisos);
      await queryInterface.sequelize.query('UPDATE roles SET permisos = :permisos WHERE id = :id', {
        replacements: { permisos: JSON.stringify(nuevos), id: rol.id },
      });
    }

    const [usuarios] = await queryInterface.sequelize.query(
      "SELECT id, funcionalidades_adicionales FROM usuarios WHERE funcionalidades_adicionales IS NOT NULL AND funcionalidades_adicionales != '[]'"
    );
    for (const usuario of usuarios) {
      const nuevos = migrarSlugs(usuario.funcionalidades_adicionales);
      await queryInterface.sequelize.query('UPDATE usuarios SET funcionalidades_adicionales = :permisos WHERE id = :id', {
        replacements: { permisos: JSON.stringify(nuevos), id: usuario.id },
      });
    }
  },
};
