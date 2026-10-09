// Montado en /presence (ver routes/index.js). POST lo llama cualquier
// autenticado (reporta SU propia presencia); GET y GET /stream son solo-ADMIN
// (chequeado dentro del controller, igual que el original -- no vía
// requireAdmin en la ruta, porque POST no debe tener ese candado).
const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const controller = require('./presence.controller');

const router = express.Router();

router.post('/', requireAuth, controller.reportar);
router.get('/stream', requireAuth, controller.stream);
router.get('/', requireAuth, controller.listar);

module.exports = router;
