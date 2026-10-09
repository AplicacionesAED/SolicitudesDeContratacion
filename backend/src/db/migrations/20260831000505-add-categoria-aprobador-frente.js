// Solicitudes Directas: un mismo Frente puede tener aprobadores distintos
// para sus solicitudes directas que para las indirectas -- AprobadorFrente
// pasa de "una fila por frente" a "una fila por (frente, categoria)". Las
// filas reales ya configuradas quedan marcadas INDIRECTA (es lo único que
// existía hasta ahora); la fila DIRECTA de cada frente se crea vacía sola la
// primera vez que se consulta, vía el mismo findOrCreate que ya usa
// aprobadorFrente.service.js#getByFrenteId -- no hace falta poblarla acá.
//
// El nombre real de la constraint única de `frente_id` no se asume a ciegas
// (Sequelize/Postgres pueden nombrarla distinto según la versión) -- se busca
// en information_schema antes de borrarla.
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('aprobador_frentes', 'categoria', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'INDIRECTA',
    });

    const [constraints] = await queryInterface.sequelize.query(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'aprobador_frentes'
        AND tc.constraint_type = 'UNIQUE'
        AND kcu.column_name = 'frente_id'
    `);
    for (const { constraint_name: name } of constraints) {
      await queryInterface.removeConstraint('aprobador_frentes', name);
    }

    await queryInterface.addConstraint('aprobador_frentes', {
      fields: ['frente_id', 'categoria'],
      type: 'unique',
      name: 'aprobador_frentes_frente_id_categoria_key',
    });
  },
};
