// Montado en /especialidades (ver routes/index.js). Escritura restringida al
// permiso granular 'gestionar_especialidades'. Lectura restringida a
// 'ver_especialidades' (2026-09-02 "permisos por módulo, desglosados") --
// antes era abierta a cualquier autenticado porque el selector de
// especialidades de un Tercero las necesitaba sin importar el rol; ahora
// ese selector solo puede quedar vacío para un rol al que un admin le
// revoque este permiso explícitamente (nadie lo pierde por defecto, ver
// 20260831000514-agregar-ver-especialidades.js).
const express = require('express');
const validate = require('../../middlewares/validate');
const { requireAuth, requirePermiso } = require('../../middlewares/auth');
const controller = require('./especialidad.controller');
const { createSchema, updateSchema, importSchema } = require('./especialidad.schema');

const router = express.Router();
const requireGestionar = requirePermiso('gestionar_especialidades');
const requireVer = requirePermiso('ver_especialidades');

router.get('/', requireAuth, requireVer, controller.list);
router.post('/', requireAuth, requireGestionar, validate(createSchema, 'body'), controller.create);
router.post('/import', requireAuth, requireGestionar, validate(importSchema, 'body'), controller.importar);
router.put('/:id', requireAuth, requireGestionar, validate(updateSchema, 'body'), controller.update);
router.delete('/:id', requireAuth, requireGestionar, controller.remove);

module.exports = router;
