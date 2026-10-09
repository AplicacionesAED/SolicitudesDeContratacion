// Montado en /actividad (ver routes/index.js). Todo solo-ADMIN -- mismo
// candado que api/actividad/*/route.ts en el original (monitoreo interno de
// uso, no algo que un SOLICITANTE deba poder consultar).
const express = require('express');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const controller = require('./actividad.controller');

const router = express.Router();

router.get('/historial', requireAuth, requireAdmin, controller.historial);
router.get('/sesiones', requireAuth, requireAdmin, controller.sesiones);
router.get('/stats', requireAuth, requireAdmin, controller.stats);
router.get('/export', requireAuth, requireAdmin, controller.exportar);

module.exports = router;
