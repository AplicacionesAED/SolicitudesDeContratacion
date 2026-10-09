// Montado en /proyectos (ver routes/index.js). Lectura para cualquier usuario
// autenticado (otros módulos -- Frentes, Solicitudes -- necesitan listar
// proyectos para sus selects); escritura restringida a ADMIN.
const express = require('express');
const validate = require('../../middlewares/validate');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const controller = require('./proyecto.controller');
const { createSchema, updateSchema } = require('./proyecto.schema');

const router = express.Router();

router.get('/', requireAuth, controller.list);
router.get('/:id', requireAuth, controller.getById);
router.post('/', requireAuth, requireAdmin, validate(createSchema, 'body'), controller.create);
router.put('/:id', requireAuth, requireAdmin, validate(updateSchema, 'body'), controller.update);

module.exports = router;
