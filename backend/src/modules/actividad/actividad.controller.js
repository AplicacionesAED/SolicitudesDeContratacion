const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const service = require('./actividad.service');

function parseQuery(q) {
  return {
    usuarioId: q.userId ? Number(q.userId) : undefined,
    tipo: q.tipo,
    desde: q.desde,
    hasta: q.hasta,
    page: q.page ? parseInt(q.page, 10) : 1,
    limit: q.limit ? parseInt(q.limit, 10) : 50,
  };
}

const historial = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.historial(parseQuery(req.query));
  ok(res, data, { pagination });
});

const sesiones = asyncHandler(async (req, res) => {
  const { data, pagination } = await service.sesiones(parseQuery(req.query));
  ok(res, data, { pagination });
});

const stats = asyncHandler(async (req, res) => ok(res, await service.stats({ desde: req.query.desde, hasta: req.query.hasta })));

const exportar = asyncHandler(async (req, res) => {
  const tipo = req.query.tipo || 'actividades';
  const formato = req.query.formato || 'csv';
  if (!['actividades', 'sesiones'].includes(tipo)) {
    return res.status(400).json({ success: false, error: { message: "Tipo inválido. Use 'actividades' o 'sesiones'" } });
  }
  if (formato !== 'csv') {
    return res.status(400).json({ success: false, error: { message: "Formato no soportado. Use 'csv'" } });
  }
  const { filename, csv } = await service.exportarCsv({ tipo, usuarioId: req.query.userId ? Number(req.query.userId) : undefined, desde: req.query.desde, hasta: req.query.hasta });
  res.status(200);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

module.exports = { historial, sesiones, stats, exportar };
