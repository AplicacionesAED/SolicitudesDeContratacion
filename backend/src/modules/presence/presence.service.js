// Puerto de api/presence/route.ts + api/presence/stream/route.ts -- el ÚNICO
// lugar que ESCRIBE actividades_usuario/sesiones_usuario (registrarActividad/
// gestionarSesion vivían acá mismo en el original, no en un módulo
// compartido). El lado de LECTURA de esas tablas (historial/sesiones/stats
// para la pantalla de Actividad) vive en modules/actividad/actividad.service.js.
const { Op } = require('sequelize');
const Usuario = require('../usuario/usuario.model');
const FrenteUsuario = require('../frente/frenteUsuario.model');
const Frente = require('../frente/frente.model');
const ActividadUsuario = require('../actividad/actividadUsuario.model');
const SesionUsuario = require('../actividad/sesionUsuario.model');

// Mismo umbral que el original: sin heartbeat en los últimos 75s, se
// considera "desconectado" aunque presencia_estado diga otra cosa (un
// cierre abrupto de pestaña nunca manda el POST final).
const UMBRAL_EN_LINEA_MS = 75_000;

function getClientInfo(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? String(forwarded).split(',')[0].trim() : req.socket?.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  return { ip, userAgent };
}

function parseDeviceInfo(userAgent) {
  const ua = (userAgent || '').toLowerCase();
  let dispositivo = 'desktop';
  if (/mobile|android|iphone|ipad/.test(ua)) dispositivo = /ipad/.test(ua) ? 'tablet' : 'mobile';

  let navegador = 'unknown';
  if (ua.includes('edg/')) navegador = 'Edge';
  else if (ua.includes('chrome/')) navegador = 'Chrome';
  else if (ua.includes('firefox/')) navegador = 'Firefox';
  else if (ua.includes('safari/')) navegador = 'Safari';

  let sistemaOp = 'unknown';
  if (ua.includes('windows')) sistemaOp = 'Windows';
  else if (ua.includes('mac os')) sistemaOp = 'macOS';
  else if (ua.includes('linux')) sistemaOp = 'Linux';
  else if (ua.includes('android')) sistemaOp = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) sistemaOp = 'iOS';

  return { dispositivo, navegador, sistemaOp };
}

async function registrarActividad(usuarioId, tipo, descripcion, metadata, req) {
  const { ip, userAgent } = req ? getClientInfo(req) : { ip: 'unknown', userAgent: 'unknown' };
  try {
    await ActividadUsuario.create({ usuario_id: usuarioId, tipo, descripcion, metadata: metadata ?? null, ip, user_agent: userAgent });
  } catch {
    // silencioso, igual que el original
  }
}

async function gestionarSesion(usuarioId, estado, req) {
  const { ip, userAgent } = req ? getClientInfo(req) : { ip: 'unknown', userAgent: 'unknown' };
  const { dispositivo, navegador, sistemaOp } = parseDeviceInfo(userAgent);

  if (estado === 'activo') {
    const abierta = await SesionUsuario.findOne({ where: { usuario_id: usuarioId, fin: null }, order: [['inicio', 'DESC']] });
    if (!abierta) {
      await SesionUsuario.create({ usuario_id: usuarioId, inicio: new Date(), ip, user_agent: userAgent, dispositivo, navegador, sistema_op: sistemaOp });
      await registrarActividad(usuarioId, 'login', 'Inicio de sesión', { ip, userAgent }, req);
    } else {
      await registrarActividad(usuarioId, 'heartbeat', 'Actividad detectada', { estado }, req);
    }
  } else if (estado === 'desconectado') {
    const abierta = await SesionUsuario.findOne({ where: { usuario_id: usuarioId, fin: null }, order: [['inicio', 'DESC']] });
    if (abierta) {
      const fin = new Date();
      const duracionSeg = Math.floor((fin.getTime() - new Date(abierta.inicio).getTime()) / 1000);
      await abierta.update({ fin, duracion_seg: duracionSeg });
      await registrarActividad(usuarioId, 'logout', 'Cierre de sesión', { duracionSeg, ip, userAgent }, req);
    }
  } else if (estado === 'ausente') {
    await registrarActividad(usuarioId, 'idle', 'Usuario inactivo (idle)', {}, req);
  }
}

async function reportarPresencia(usuario, estado, req) {
  const anterior = usuario.presencia_estado;
  await usuario.update({ ultima_actividad: new Date(), presencia_estado: estado });
  // Igual que el original: además del cambio de estado, un heartbeat "activo"
  // repetido también dispara gestionarSesion (para registrar el heartbeat
  // periódico dentro de la sesión abierta).
  if (anterior !== estado || estado === 'activo') {
    await gestionarSesion(usuario.id, estado, req);
  }
}

function estadoEfectivo(u) {
  const fresco = u.ultima_actividad != null && Date.now() - new Date(u.ultima_actividad).getTime() < UMBRAL_EN_LINEA_MS;
  if (u.presencia_estado === 'desconectado' || !fresco) return 'desconectado';
  if (u.presencia_estado === 'ausente') return 'ausente';
  return 'activo';
}

async function fetchPresenceData({ incluirFrentes = false } = {}) {
  const usuarios = await Usuario.findAll({
    where: { activo: true },
    attributes: ['id', 'nombre', 'email', 'cargo', 'roles', 'ultima_conexion', 'ultima_actividad', 'presencia_estado'],
    order: [['nombre', 'ASC']],
  });

  let frentesPorUsuario = new Map();
  if (incluirFrentes && usuarios.length > 0) {
    const asignaciones = await FrenteUsuario.findAll({
      where: { usuario_id: usuarios.map((u) => u.id) },
      include: [{ model: Frente, attributes: ['id', 'nombre'] }],
    });
    frentesPorUsuario = asignaciones.reduce((map, a) => {
      const lista = map.get(a.usuario_id) ?? [];
      lista.push({ id: a.Frente.id, nombre: a.Frente.nombre });
      map.set(a.usuario_id, lista);
      return map;
    }, new Map());
  }

  return usuarios.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    cargo: u.cargo,
    roles: u.roles ?? [],
    ...(incluirFrentes ? { frentes: frentesPorUsuario.get(u.id) ?? [] } : {}),
    ultimaConexion: u.ultima_conexion,
    ultimaActividad: u.ultima_actividad,
    estado: estadoEfectivo(u),
  }));
}

module.exports = { reportarPresencia, fetchPresenceData };
