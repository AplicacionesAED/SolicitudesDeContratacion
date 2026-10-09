// Nunca z.coerce.date() para una columna DATEONLY -- ver "Fechas" en
// ARQUITECTURA-BACKEND.md. Valida el string tal cual, sin pasar por un objeto
// Date de JS ni por conversión de zona horaria.
const { z } = require('zod');

function zDateOnly() {
  return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha invalida (YYYY-MM-DD)');
}

module.exports = { zDateOnly };
