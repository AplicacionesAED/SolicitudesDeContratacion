// Elimina la seccion Actividad (pedido del usuario, 2026-10-13: "ya no la ocupamos"): historial de actividad y
// presencia. DESTRUCTIVO e irreversible -- borra las tablas `actividades_usuario` y `sesiones_usuario` con todo su
// contenido y las columnas `usuarios.ultima_actividad` / `usuarios.presencia_estado`. El codigo que las usaba ya se
// elimino (commit "Elimina la sección Actividad"). Forward-only como el resto de migraciones: no hay `down`.
'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS actividades_usuario');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS sesiones_usuario');
    await queryInterface.sequelize.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS ultima_actividad');
    await queryInterface.sequelize.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS presencia_estado');
  },
};
