// Fase 6: columnas de presencia en tiempo real -- puerto de los campos
// homónimos que ya vivían en `model User` (schema.prisma) pero no se habían
// portado hasta ahora porque nada los usaba (Fases 1-5 no tocan presencia).
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('usuarios', 'ultima_actividad', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('usuarios', 'presencia_estado', { type: Sequelize.STRING(20), allowNull: true });
  },
};
