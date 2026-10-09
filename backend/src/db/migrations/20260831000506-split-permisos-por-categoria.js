// Solicitudes Directas: los 8 slugs relacionados con el ciclo de vida de una
// solicitud se separan en variantes _directa/_indirecta (ver
// utils/permisos.js#FUNCIONALIDADES_DISPONIBLES). El seeder de roles
// (20260831000003-seed-roles.js) es un no-op si `roles` ya tiene filas -- que
// las tiene, pobladas con los permisos reales de producción en la Fase 9 --
// así que editar el mapa hardcodeado en código no actualiza esas filas
// existentes. Esta migración de datos reemplaza, en cada fila real de
// `roles.permisos` y `usuarios.funcionalidades_adicionales`, cualquier slug
// viejo por SUS DOS variantes nuevas (nadie pierde acceso el día 1 -- el
// admin puede restringir a una sola categoría después desde la UI). Cualquier
// otro slug (crear_terceros, gestionar_especialidades, editar_terceros, etc.)
// se deja intacto. Forward-only, sin `down` (mismo criterio que el resto de
// migraciones del proyecto).
'use strict';

const SLUGS_A_DIVIDIR = [
  'crear_enviar_solicitudes',
  'crear_otrosi',
  'crear_solicitudes_diseno',
  'aprobar_director_tecnico',
  'aprobar_solicitudes_frente',
  'revisar_contratos',
  'registrar_adpro',
  'aprobacion_final',
];

function dividirSlugs(slugs) {
  const resultado = [];
  for (const slug of slugs ?? []) {
    if (SLUGS_A_DIVIDIR.includes(slug)) {
      if (!resultado.includes(`${slug}_directa`)) resultado.push(`${slug}_directa`);
      if (!resultado.includes(`${slug}_indirecta`)) resultado.push(`${slug}_indirecta`);
    } else if (!resultado.includes(slug)) {
      resultado.push(slug);
    }
  }
  return resultado;
}

module.exports = {
  async up(queryInterface) {
    const [roles] = await queryInterface.sequelize.query('SELECT id, permisos FROM roles');
    for (const rol of roles) {
      const nuevos = dividirSlugs(rol.permisos ?? []);
      await queryInterface.sequelize.query('UPDATE roles SET permisos = :permisos WHERE id = :id', {
        replacements: { permisos: JSON.stringify(nuevos), id: rol.id },
      });
    }

    const [usuarios] = await queryInterface.sequelize.query(
      "SELECT id, funcionalidades_adicionales FROM usuarios WHERE funcionalidades_adicionales IS NOT NULL AND funcionalidades_adicionales != '[]'"
    );
    for (const usuario of usuarios) {
      const nuevos = dividirSlugs(usuario.funcionalidades_adicionales ?? []);
      await queryInterface.sequelize.query('UPDATE usuarios SET funcionalidades_adicionales = :permisos WHERE id = :id', {
        replacements: { permisos: JSON.stringify(nuevos), id: usuario.id },
      });
    }
  },
};
