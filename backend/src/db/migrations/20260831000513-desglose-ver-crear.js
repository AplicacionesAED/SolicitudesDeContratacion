// "Desglose ver/crear" (2026-09-02, mismo día que "eliminar permisos de rol
// para solicitudes"): el primer corte de ese refactor colapsó crear/enviar
// en un solo permiso de MÓDULO por categoría (modulo_solicitudes_directas/
// indirectas) -- pero eso no permitía "puede ver todas las solicitudes
// directas pero no puede crear una nueva" (el caso real de CONTRATOS/
// CONTROLES/DIRECTOR_TECNICO/DIRECTOR_CONTROLES/GERENCIA, que necesitan
// navegar el listado para actuar sobre lo que tienen asignado sin poder
// generar una solicitud nueva). Cada módulo se separa en VER y CREAR --
// ver utils/permisos.js para el detalle completo.
//
// Nadie pierde acceso el día del deploy: ANTES de este desglose, listar/
// navegar Solicitudes y Terceros no tenía ningún permiso propio (el filtro
// real era por registro dentro del resultado, nunca por sección) -- así que
// TODOS los roles reales reciben `ver_solicitudes_directas`/
// `ver_solicitudes_indirectas`/`ver_terceros` acá, sin condición. Solo los
// roles que ya tenían el módulo completo (`modulo_solicitudes_directa/
// indirecta`) conservan además el `crear_solicitudes_*` correspondiente --
// ese es el único permiso que de verdad se restringe respecto a antes
// (exactamente el pedido: quien nunca pudo crear, sigue sin poder).
'use strict';

module.exports = {
  async up(queryInterface) {
    const [roles] = await queryInterface.sequelize.query('SELECT id, permisos FROM roles');
    for (const rol of roles) {
      const actuales = rol.permisos ?? [];
      const nuevos = new Set(actuales.filter((s) => s !== 'modulo_solicitudes_directas' && s !== 'modulo_solicitudes_indirectas'));
      if (actuales.includes('modulo_solicitudes_directas')) nuevos.add('crear_solicitudes_directas');
      if (actuales.includes('modulo_solicitudes_indirectas')) nuevos.add('crear_solicitudes_indirectas');
      nuevos.add('ver_solicitudes_directas');
      nuevos.add('ver_solicitudes_indirectas');
      nuevos.add('ver_terceros');
      await queryInterface.sequelize.query('UPDATE roles SET permisos = :permisos WHERE id = :id', {
        replacements: { permisos: JSON.stringify([...nuevos]), id: rol.id },
      });
    }

    // funcionalidades_adicionales: solo traduce un modulo_solicitudes_X
    // concedido a mano a un usuario puntual (raro) -- ver_terceros/
    // ver_solicitudes_X no hace falta agregarlos acá, ya los tiene todo el
    // mundo vía su rol.
    const [usuarios] = await queryInterface.sequelize.query(
      "SELECT id, funcionalidades_adicionales FROM usuarios WHERE funcionalidades_adicionales IS NOT NULL AND funcionalidades_adicionales != '[]'"
    );
    for (const usuario of usuarios) {
      const actuales = usuario.funcionalidades_adicionales ?? [];
      if (!actuales.includes('modulo_solicitudes_directas') && !actuales.includes('modulo_solicitudes_indirectas')) continue;
      const nuevos = new Set(actuales.filter((s) => s !== 'modulo_solicitudes_directas' && s !== 'modulo_solicitudes_indirectas'));
      if (actuales.includes('modulo_solicitudes_directas')) {
        nuevos.add('ver_solicitudes_directas');
        nuevos.add('crear_solicitudes_directas');
      }
      if (actuales.includes('modulo_solicitudes_indirectas')) {
        nuevos.add('ver_solicitudes_indirectas');
        nuevos.add('crear_solicitudes_indirectas');
      }
      await queryInterface.sequelize.query('UPDATE usuarios SET funcionalidades_adicionales = :permisos WHERE id = :id', {
        replacements: { permisos: JSON.stringify([...nuevos]), id: usuario.id },
      });
    }
  },
};
