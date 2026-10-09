// Montado en /solicitudes (ver routes/index.js). Rutas estáticas
// (/cronograma/export) ANTES de "/:id" -- ver la regla crítica de orden de
// rutas en ARQUITECTURA-BACKEND.md.
const express = require('express');
const validate = require('../../middlewares/validate');
const { requireAuth } = require('../../middlewares/auth');
const controller = require('./solicitud.controller');
const estado = require('./solicitud.estado');
const cronograma = require('./cronograma');
const cuadroComparativo = require('./cuadroComparativo');
const memoria = require('./memoria');
const documento = require('./documento');
const ordenServicio = require('./ordenServicio');
const cronogramaExport = require('./cronogramaExport');
const importarHistorico = require('./solicitud.importarHistorico');
const { createSchema, updateSchema, estadoSchema } = require('./solicitud.schema');

const router = express.Router();

router.post('/cronograma/export', requireAuth, cronogramaExport.exportarCronograma);
router.post('/importar-historico', requireAuth, importarHistorico.importar);

router.get('/', requireAuth, controller.list);
router.post('/', requireAuth, validate(createSchema, 'body'), controller.create);
router.get('/:id', requireAuth, controller.getById);
router.patch('/:id', requireAuth, validate(updateSchema, 'body'), controller.update);
router.post('/:id/completar-historico', requireAuth, controller.completarHistorico);
router.delete('/:id', requireAuth, controller.remove);
router.post('/:id/estado', requireAuth, validate(estadoSchema, 'body'), estado.cambiarEstado);
router.post('/:id/cronograma', requireAuth, cronograma.upsertCronograma);
router.put('/:id/cronograma', requireAuth, cronograma.upsertCronograma);
router.post('/:id/cuadro-comparativo', requireAuth, cuadroComparativo.upsertCuadroComparativo);
router.put('/:id/cuadro-comparativo', requireAuth, cuadroComparativo.upsertCuadroComparativo);
router.post('/:id/memoria', requireAuth, memoria.upsertMemoria);
router.put('/:id/memoria', requireAuth, memoria.upsertMemoria);
router.post('/:id/documento', requireAuth, documento.generarDocumento);
router.post('/:id/orden-servicio', requireAuth, ordenServicio.generarOrdenServicio);

module.exports = router;
