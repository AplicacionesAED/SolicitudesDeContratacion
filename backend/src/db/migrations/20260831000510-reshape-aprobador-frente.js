// Elimina los permisos de rol para autorizar aprobaciones (2026-09-02): cada
// "rol de responsabilidad" por frente+categoría deja de ser un array plano
// de IDs y pasa a `{ usuarios: [ids], roles: [nombresDeRol] }` -- una
// persona califica si está en `usuarios` O si su rol está en `roles`. Los 4
// slots existentes migran sus arrays viejos a `usuarios` (con `roles: []`,
// nadie pierde acceso); `controles_id` (antes un campo suelto e
// informativo) migra a `controles_adpro.usuarios`. `director_tecnico`/
// `controles_adpro` son slots NUEVOS -- se siembran con
// roles:['DIRECTOR_TECNICO']/['CONTROLES'] respectivamente para reproducir
// el comportamiento actual (cualquier usuario con ese rol podía actuar en
// cualquier frente) y que el deploy no le quite acceso a nadie el primer
// día.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('aprobador_frentes', 'director_proyecto', { type: Sequelize.JSONB, allowNull: false, defaultValue: { usuarios: [], roles: [] } });
    await queryInterface.addColumn('aprobador_frentes', 'contratos_tramite', { type: Sequelize.JSONB, allowNull: false, defaultValue: { usuarios: [], roles: [] } });
    await queryInterface.addColumn('aprobador_frentes', 'contratos_minuta', { type: Sequelize.JSONB, allowNull: false, defaultValue: { usuarios: [], roles: [] } });
    await queryInterface.addColumn('aprobador_frentes', 'director_controles', { type: Sequelize.JSONB, allowNull: false, defaultValue: { usuarios: [], roles: [] } });
    await queryInterface.addColumn('aprobador_frentes', 'director_tecnico', { type: Sequelize.JSONB, allowNull: false, defaultValue: { usuarios: [], roles: ['DIRECTOR_TECNICO'] } });
    await queryInterface.addColumn('aprobador_frentes', 'controles_adpro', { type: Sequelize.JSONB, allowNull: false, defaultValue: { usuarios: [], roles: ['CONTROLES'] } });

    await queryInterface.sequelize.query(`
      UPDATE aprobador_frentes SET
        director_proyecto = jsonb_build_object('usuarios', COALESCE(aprobador_ids, '[]'::jsonb), 'roles', '[]'::jsonb),
        contratos_tramite = jsonb_build_object('usuarios', COALESCE(contratos_tramite_ids, '[]'::jsonb), 'roles', '[]'::jsonb),
        contratos_minuta = jsonb_build_object('usuarios', COALESCE(contratos_minuta_ids, '[]'::jsonb), 'roles', '[]'::jsonb),
        director_controles = jsonb_build_object('usuarios', COALESCE(director_controles_ids, '[]'::jsonb), 'roles', '[]'::jsonb),
        controles_adpro = jsonb_build_object(
          'usuarios', CASE WHEN controles_id IS NOT NULL THEN jsonb_build_array(controles_id) ELSE '[]'::jsonb END,
          'roles', '["CONTROLES"]'::jsonb
        )
    `);

    await queryInterface.removeColumn('aprobador_frentes', 'aprobador_ids');
    await queryInterface.removeColumn('aprobador_frentes', 'contratos_tramite_ids');
    await queryInterface.removeColumn('aprobador_frentes', 'contratos_minuta_ids');
    await queryInterface.removeColumn('aprobador_frentes', 'director_controles_ids');
    await queryInterface.removeColumn('aprobador_frentes', 'controles_id');
  },
};
