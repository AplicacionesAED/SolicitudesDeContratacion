// Montado en /notificaciones (ver routes/index.js). Todo requiere sesión --
// cada usuario solo ve/marca las suyas (filtradas por req.usuario.id en el
// service, nunca por un parámetro de la URL).
const express = require('express');
const validate = require('../../middlewares/validate');
const { requireAuth } = require('../../middlewares/auth');
const controller = require('./notificacion.controller');
const { marcarLeidaSchema } = require('./notificacion.schema');

const router = express.Router();

router.get('/stream', requireAuth, controller.stream);
router.get('/', requireAuth, controller.listar);
router.patch('/', requireAuth, validate(marcarLeidaSchema, 'body'), controller.marcar);

module.exports = router;
