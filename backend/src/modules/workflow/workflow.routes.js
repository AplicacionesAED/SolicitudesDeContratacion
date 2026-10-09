// Montado en /workflows (ver routes/index.js) -- admin-only, igual que /roles.
// Solo desvíos condicionales -- el CRUD de "pasos"/permiso requerido se
// eliminó (2026-09-02, ver workflow.service.js).
const express = require('express');
const validate = require('../../middlewares/validate');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const controller = require('./workflow.controller');
const { desvioSchema, updateDesvioSchema, layoutSchema } = require('./workflow.schema');

const router = express.Router();

router.get('/desvios', requireAuth, requireAdmin, controller.listDesvios);
router.post('/desvios', requireAuth, requireAdmin, validate(desvioSchema, 'body'), controller.createDesvio);
router.put('/desvios/:id', requireAuth, requireAdmin, validate(updateDesvioSchema, 'body'), controller.updateDesvio);
router.delete('/desvios/:id', requireAuth, requireAdmin, controller.removeDesvio);

// Acomodo manual del canvas (2026-09-02, "dame acceso a modificar las
// líneas") -- compartido entre todos los admins, ver workflowLayout.model.js.
router.get('/layout', requireAuth, requireAdmin, controller.getLayout);
router.put('/layout', requireAuth, requireAdmin, validate(layoutSchema, 'body'), controller.saveLayout);

module.exports = router;
