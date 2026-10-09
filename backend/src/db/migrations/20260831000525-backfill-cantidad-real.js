// Backfill de datos, no solo de esquema -- la migración anterior
// (20260831000524) agregó `cantidad_real` con default 0. Cualquier
// Cuadro Comparativo real guardado ANTES de esa migración (si lo hay)
// quedaría con `cantidad_real = 0` en todos sus ítems -- y como
// calcularValorTotalItem() ahora multiplica por `cantidadReal` (no
// `cantidad`), su "Valor Total"/Costo Total se vería en $0 de la nada, un
// regreso silencioso real. Antes de este cambio, `cantidad` era el único
// campo que alimentaba ese cálculo -- respaldarlo ahí es lo más fiel al
// número que esa solicitud ya mostraba.
'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `UPDATE cuadro_comparativo_items SET cantidad_real = cantidad WHERE cantidad_real = 0`
    );
  },
};
