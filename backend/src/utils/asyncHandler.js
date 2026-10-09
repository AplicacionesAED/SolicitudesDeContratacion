// Envuelve un controller async: cualquier rechazo de la Promise pasa a
// next(err) en vez de convertirse en un "unhandled rejection" silencioso.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
