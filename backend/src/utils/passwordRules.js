// PLANTILLA -- copiado tal cual. Va en backend/src/utils/passwordRules.js. Las 4
// reglas (8+ caracteres, mayúscula, número, carácter especial) son el mínimo de
// todo proyecto aed -- no se relajan por proyecto. Si un proyecto necesita reglas
// EXTRA, se agregan a este array, nunca se quitan las que ya están.
const ApiError = require('./ApiError');

const REGLAS = [
  [/.{8,}/, 'Mínimo 8 caracteres'],
  [/[A-Z]/, 'Al menos una letra mayúscula'],
  [/[0-9]/, 'Al menos un número'],
  [/[^A-Za-z0-9]/, 'Al menos un carácter especial (!@#$%…)'],
];

// Lanza 422 con el detalle de que reglas fallaron.
function validatePassword(password) {
  const faltantes = REGLAS.filter(([pattern]) => !pattern.test(password)).map(([, msg]) => msg);
  if (faltantes.length > 0) {
    throw new ApiError(422, 'Contraseña insegura', { requisitos_faltantes: faltantes });
  }
}

module.exports = { validatePassword };
