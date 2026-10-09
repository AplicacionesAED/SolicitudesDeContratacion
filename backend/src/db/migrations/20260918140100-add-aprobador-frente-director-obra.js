'use strict';

// Flujo propio de Directa (Orden de Servicio), 2026-09-18 -- slot nuevo
// "Director de Obra" en AprobadorFrente, separado de `director_proyecto`
// (confirmado con el usuario: es un rol/slot distinto, no una etiqueta
// alternativa -- ver la migración de seed del rol, misma fecha). Mismo
// patrón que 20260918130000-add-aprobador-frente-directa-slots.js -- una
// migración aparte porque esa ya corrió (agregarlo ahí no lo aplicaría acá).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('aprobador_frentes', 'director_obra', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: { usuarios: [], roles: [] },
    });
  },
};
