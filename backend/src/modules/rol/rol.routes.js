// Montado en /roles (ver routes/index.js). Administración de permisos por rol
// -- ya no es requireAdmin puro, gateado por el permiso 'ver_roles' (puerto
// de HRMS, 2026-09-18, mismo pedido explicito del usuario que /usuarios).
// ADMIN sigue pasando siempre (tienePermiso hace bypass). Quien tenga este
// permiso puede editar los permisos de CUALQUIER rol, incluido el suyo --
// ver la nota de auto-escalacion en utils/permisos.js#FUNCIONALIDADES_DISPONIBLES#ver_roles.
const express = require('express');
const validate = require('../../middlewares/validate');
const { requireAuth, requirePermiso } = require('../../middlewares/auth');
const controller = require('./rol.controller');
const { createSchema, updateSchema } = require('./rol.schema');

const router = express.Router();

// Ruta estatica ANTES de "/:nombre".
router.get('/funcionalidades-disponibles', requireAuth, requirePermiso('ver_roles'), controller.funcionalidadesDisponibles);

router.get('/', requireAuth, requirePermiso('ver_roles'), controller.list);
router.post('/', requireAuth, requirePermiso('ver_roles'), validate(createSchema, 'body'), controller.create);
router.put('/:nombre', requireAuth, requirePermiso('ver_roles'), validate(updateSchema, 'body'), controller.update);
router.delete('/:nombre', requireAuth, requirePermiso('ver_roles'), controller.remove);

module.exports = router;
