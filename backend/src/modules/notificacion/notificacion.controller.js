const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const service = require('./notificacion.service');

const listar = asyncHandler(async (req, res) => ok(res, await service.listar(req.usuario.id)));

const marcar = asyncHandler(async (req, res) => {
  const { all, id } = req.body;
  if (all === true) {
    await service.marcarTodasLeidas(req.usuario.id);
    return ok(res, { message: 'Todas las notificaciones marcadas como leídas' });
  }
  ok(res, await service.marcarLeida(req.usuario.id, id));
});

// SSE: mismo contrato que api/notificaciones/stream/route.ts -- heartbeat
// ": ping" inicial, poll cada 10s, un `data:` solo cuando el conteo cambia.
// Express (a diferencia del ReadableStream de Next.js) no aborta la conexión
// solo -- hay que limpiar el interval en 'close' explícitamente o el proceso
// acumula timers de clientes que ya se fueron.
function stream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const usuarioId = req.usuario.id;
  let lastCount = -1;
  res.write(': ping\n\n');

  const intervalId = setInterval(async () => {
    try {
      const count = await service.contarNoLeidas(usuarioId);
      if (count !== lastCount) {
        lastCount = count;
        res.write(`data: ${JSON.stringify({ totalNoLeidas: count })}\n\n`);
      } else {
        res.write(': ping\n\n');
      }
    } catch {
      clearInterval(intervalId);
      res.end();
    }
  }, 10_000);

  req.on('close', () => clearInterval(intervalId));
}

module.exports = { listar, marcar, stream };
