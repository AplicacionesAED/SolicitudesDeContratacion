// Montado en /files (ver routes/index.js). Autenticado, no estático --
// mismo criterio que api/files/[filename]/route.ts.
const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const controller = require('./files.controller');

const router = express.Router();

// Archivos nuevos: viven en Google Drive.
router.get('/drive/:fileId', requireAuth, controller.servirDrive);
// Archivos viejos (disco local, migrados de la app original): se conserva para no romper registros existentes.
router.get('/:filename', requireAuth, controller.servir);

module.exports = router;
