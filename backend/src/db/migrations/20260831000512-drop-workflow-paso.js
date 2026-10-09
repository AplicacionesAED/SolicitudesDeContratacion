// "Eliminar permisos de rol para solicitudes" (2026-09-02): ninguna acción
// de aprobación se gatea ya por un permiso de rol -- workflow_pasos
// (permisos_base por acción) queda sin ningún consumidor. Se borra en vez
// de dejarla como una tabla/pantalla muerta que ya no autoriza nada.
// workflow_desvios NO se toca -- sigue siendo el mecanismo real de desvíos
// condicionales, independiente de esto.
'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('workflow_pasos');
  },
};
