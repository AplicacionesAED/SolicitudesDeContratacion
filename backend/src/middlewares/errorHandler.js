const ApiError = require('../utils/ApiError');

// Único lugar que formatea una respuesta de error -- traduce automáticamente
// los errores que Sequelize lanza (ver "Respuestas y errores" en
// ARQUITECTURA-BACKEND.md).
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, error: { message: err.message, details: err.details } });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ success: false, error: { message: 'Ya existe un registro con ese valor único' } });
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({ success: false, error: { message: 'La operación viola una relación existente' } });
  }
  if (err.name === 'SequelizeValidationError') {
    const details = err.errors.map((e) => ({ path: e.path, message: e.message }));
    return res.status(422).json({ success: false, error: { message: 'Datos inválidos', details } });
  }

  console.error(err);
  return res.status(500).json({ success: false, error: { message: 'Error interno del servidor' } });
}

module.exports = errorHandler;
