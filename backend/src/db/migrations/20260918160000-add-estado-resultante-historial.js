// Bug real encontrado con Playwright (2026-09-18): "Estado resultante" en
// HistorialSeguimiento.jsx se calculaba en el FRONTEND con un mapa estático
// accion -> estado (ACCION_ESTADO_DESTINO), ignorando los desvíos
// condicionales de `workflow_desvios` -- una Directa que ejecuta
// APROBAR_DIRECTOR cae en EN_PROYECCION_CONTROLES (el desvío sembrado para
// esa categoría), pero el historial seguía mostrando "En Trámite Contratos"
// (el destino genérico del mapa). Se persiste el estado REAL ya resuelto
// (con el desvío aplicado) en cada fila, en vez de recalcularlo a ciegas.
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('historial_solicitudes', 'estado_resultante', {
      type: Sequelize.STRING(40),
      allowNull: true,
    });
  },
};
