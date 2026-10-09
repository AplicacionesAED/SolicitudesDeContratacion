// PLANTILLA -- copiado tal cual. Va en backend/src/utils/passwordRules.js. Las 4
// reglas (8+ caracteres, mayúscula, número, carácter especial) son el mínimo de
// todo proyecto aed -- no se relajan por proyecto. Si un proyecto necesita reglas
// EXTRA, se agregan a este array, nunca se quitan las que ya están.
const crypto = require('crypto');
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

// Sin I/O/0/1 (ambiguos al leerlos en voz alta o a mano): la contrasena
// temporal la transcribe un admin a la persona. Mismo generador que el HRMS.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%&*?';
const ALL = UPPER + LOWER + DIGITS + SPECIAL;

function randomChar(charset) {
  return charset[crypto.randomInt(charset.length)];
}

// Genera una contrasena temporal que siempre cumple REGLAS de arriba. Nunca se
// guarda en texto plano, solo se devuelve una vez en la respuesta HTTP.
function generateRandomPassword() {
  const obligatorios = [randomChar(UPPER), randomChar(LOWER), randomChar(DIGITS), randomChar(SPECIAL)];
  const resto = Array.from({ length: 8 }, () => randomChar(ALL));
  const chars = [...obligatorios, ...resto];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

module.exports = { validatePassword, generateRandomPassword };
