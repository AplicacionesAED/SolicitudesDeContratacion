// ÚNICO lugar que mapea rutas URL a routers de módulo.
const express = require('express');

const router = express.Router();

router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/usuarios', require('../modules/usuario/usuario.routes'));
router.use('/roles', require('../modules/rol/rol.routes'));
router.use('/workflows', require('../modules/workflow/workflow.routes'));
router.use('/proyectos', require('../modules/proyecto/proyecto.routes'));
router.use('/frentes', require('../modules/frente/frente.routes'));
// mergeParams: true en aprobadorFrente.routes.js lee :frenteId de acá.
router.use('/frentes/:frenteId/aprobador', require('../modules/aprobadorFrente/aprobadorFrente.routes'));
router.use('/especialidades', require('../modules/especialidad/especialidad.routes'));
router.use('/terceros', require('../modules/tercero/tercero.routes'));
router.use('/solicitudes', require('../modules/solicitud/solicitud.routes'));
router.use('/notificaciones', require('../modules/notificacion/notificacion.routes'));
router.use('/actividad', require('../modules/actividad/actividad.routes'));
router.use('/presence', require('../modules/presence/presence.routes'));
router.use('/dashboard', require('../modules/dashboard/dashboard.routes'));
router.use('/upload', require('../modules/upload/upload.routes'));
router.use('/files', require('../modules/upload/files.routes'));

module.exports = router;
