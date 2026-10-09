// Montado en /files (ver routes/index.js). Autenticado, no estático --
// mismo criterio que api/files/[filename]/route.ts.
const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const controller = require('./files.controller');

const router = express.Router();

router.get('/:filename', requireAuth, controller.servir);

module.exports = router;
