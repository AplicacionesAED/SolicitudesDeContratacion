// Montado en /frentes/:frenteId/aprobador (ver routes/index.js) --
// express.Router({ mergeParams: true }) para leer :frenteId del padre.
const express = require('express');
const validate = require('../../middlewares/validate');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const controller = require('./aprobadorFrente.controller');
const { updateSchema } = require('./aprobadorFrente.schema');

const router = express.Router({ mergeParams: true });

router.get('/', requireAuth, controller.getByFrenteId);
router.put('/', requireAuth, requireAdmin, validate(updateSchema, 'body'), controller.update);

module.exports = router;
