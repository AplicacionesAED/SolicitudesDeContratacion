'use strict';
// 2026-09-09 "eso de OBRA no es necesario" -- pedido explícito del usuario:
// el valor guardado de `tipo_contrato` deja de ser 'OBRA' para las dos
// categorías (con solo la ETIQUETA cambiando según categoría) y pasa a ser
// un valor DISTINTO por categoría: 'TODO_COSTO' en Directa, 'OTROS_SERVICIOS'
// en Indirecta. 'DISENO' no cambia (nunca aplicó a Directa). Migración de
// datos, no de esquema -- `tipo_contrato` sigue siendo un STRING libre, sin
// enum a nivel de base.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE solicitudes SET tipo_contrato = 'OTROS_SERVICIOS' WHERE tipo_contrato = 'OBRA' AND categoria = 'INDIRECTA'`
    );
    await queryInterface.sequelize.query(
      `UPDATE solicitudes SET tipo_contrato = 'TODO_COSTO' WHERE tipo_contrato = 'OBRA' AND categoria = 'DIRECTA'`
    );
  },
};
