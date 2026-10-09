// Montado en /frentes (ver routes/index.js).
const express = require('express');
const validate = require('../../middlewares/validate');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const controller = require('./frente.controller');
const { createSchema, updateSchema, usuariosSchema } = require('./frente.schema');

const router = express.Router();

router.get('/', requireAuth, controller.list);
router.get('/:id', requireAuth, controller.getById);
router.post('/', requireAuth, requireAdmin, validate(createSchema, 'body'), controller.create);
router.put('/:id', requireAuth, requireAdmin, validate(updateSchema, 'body'), controller.update);
router.put('/:id/usuarios', requireAuth, requireAdmin, validate(usuariosSchema, 'body'), controller.setUsuarios);

module.exports = router;
