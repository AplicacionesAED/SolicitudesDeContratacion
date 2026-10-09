// Montado en /upload (ver routes/index.js). Cualquier autenticado puede
// subir -- el control de qué solicitud queda referenciando el archivo vive
// en el PATCH de esa solicitud (archivosAnexos/archivo*), no acá.
const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const controller = require('./upload.controller');

const router = express.Router();

router.post('/', requireAuth, controller.subir);

module.exports = router;
