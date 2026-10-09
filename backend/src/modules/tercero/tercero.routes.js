// Montado en /terceros (ver routes/index.js). Los permisos de escritura son
// dinámicos según el body (ver tercero.controller.js), por eso las rutas de
// escritura solo exigen requireAuth acá -- el chequeo fino vive en el
// controller. `crear_terceros` (POST) ya gateaba la creación desde antes;
// `ver_terceros` es nuevo (2026-09-02 "desglose ver/crear") -- antes
// CUALQUIER autenticado podía ver el Directorio completo sin ningún permiso
// propio.
const express = require('express');
const validate = require('../../middlewares/validate');
const { requireAuth, requirePermiso } = require('../../middlewares/auth');
const controller = require('./tercero.controller');
const sync = require('./tercero.sync');
const { createSchema, updateSchema } = require('./tercero.schema');

const router = express.Router();
const requireVer = requirePermiso('ver_terceros');

router.get('/', requireAuth, requireVer, controller.list);
router.post('/sync-sharepoint', requireAuth, sync.sincronizar);
router.get('/:id', requireAuth, requireVer, controller.getById);
router.post('/', requireAuth, validate(createSchema, 'body'), controller.create);
router.patch('/:id', requireAuth, validate(updateSchema, 'body'), controller.update);
router.delete('/:id', requireAuth, controller.remove);

module.exports = router;
