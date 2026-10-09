// Montado en /dashboard (ver routes/index.js). Lectura para cualquier
// autenticado -- los KPIs y la lista de recientes ya vienen escopeados por
// visibilidad dentro del service, no hace falta un requirePermiso acá.
const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const controller = require('./dashboard.controller');

const router = express.Router();

router.get('/stats', requireAuth, controller.stats);
router.get('/recientes', requireAuth, controller.recientes);

module.exports = router;
