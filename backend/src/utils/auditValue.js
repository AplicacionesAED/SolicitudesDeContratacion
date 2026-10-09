// Sequelize devuelve DATEONLY como string y DECIMAL como string con decimales
// fijos -- sin normalizar antes de comparar, cualquier edición no relacionada
// dispara un falso "cambió". Ver "Patrón: auditoría genérica" en
// ARQUITECTURA-BACKEND.md.
function auditoriaTexto(value) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function auditoriaValoresIguales(before, after) {
  return auditoriaTexto(before) === auditoriaTexto(after);
}

module.exports = { auditoriaTexto, auditoriaValoresIguales };
