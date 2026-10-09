const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const service = require('./presence.service');

const ESTADOS_VALIDOS = new Set(['activo', 'ausente', 'desconectado']);

// El heartbeat de usePresence.js manda `sendBeacon` con Content-Type
// text/plain (más fiable en pagehide) -- express.json() no parsea ese body,
// así que req.body puede llegar undefined/{} incluso con un payload válido;
// se degrada al mismo default ("activo") que el original ante cualquier body
// vacío o malformado, y jamás bloquea al cliente si falla la escritura.
const reportar = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const estado = typeof body.estado === 'string' && ESTADOS_VALIDOS.has(body.estado) ? body.estado : 'activo';
  try {
    await service.reportarPresencia(req.usuario, estado, req);
  } catch {
    // no bloquear al cliente
  }
  res.status(204).end();
});

const listar = asyncHandler(async (req, res) => {
  if (!req.usuario.esAdmin) throw new ApiError(403, 'Solo ADMIN puede ver la presencia');
  ok(res, await service.fetchPresenceData({ incluirFrentes: true }));
});

// SSE cada 5s (más frecuente que notificaciones porque alimenta un dashboard
// en vivo, no un badge) -- mismo patrón de heartbeat ": ping" + limpieza en
// 'close' que notificacion.controller.js#stream.
function stream(req, res) {
  if (!req.usuario.esAdmin) {
    res.status(403).end('Solo ADMIN');
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let lastData = null;
  res.write(': ping\n\n');

  const intervalId = setInterval(async () => {
    try {
      const data = await service.fetchPresenceData({ incluirFrentes: false });
      const json = JSON.stringify(data);
      if (json !== lastData) {
        lastData = json;
        res.write(`data: ${json}\n\n`);
      } else {
        res.write(': ping\n\n');
      }
    } catch {
      clearInterval(intervalId);
      res.end();
    }
  }, 5_000);

  req.on('close', () => clearInterval(intervalId));
}

module.exports = { reportar, listar, stream };
