// Puerto del lado de LECTURA de api/actividad/{historial,sesiones,stats,export}
// -- el lado de ESCRITURA (registrarActividad/gestionarSesion, que vivía
// dentro de api/presence/route.ts en el original) está en
// modules/presence/presence.service.js, porque solo ese endpoint escribe
// estas tablas.
const { Op, fn, col } = require('sequelize');
const sequelize = require('../../config/db');
const Usuario = require('../usuario/usuario.model');
const ActividadUsuario = require('./actividadUsuario.model');
const SesionUsuario = require('./sesionUsuario.model');

const TIPOS_VALIDOS = new Set(['login', 'logout', 'heartbeat', 'idle', 'active', 'page_view', 'action']);
const USUARIO_ATTRS = ['id', 'nombre', 'email', 'cargo'];

function rangoFecha(campo, desde, hasta) {
  if (!desde && !hasta) return undefined;
  const cond = {};
  if (desde) cond[Op.gte] = new Date(desde);
  if (hasta) cond[Op.lte] = new Date(hasta);
  return { [campo]: cond };
}

function _enrichActividad(a) {
  const d = a.toJSON();
  return {
    id: d.id,
    usuarioId: d.usuario_id,
    tipo: d.tipo,
    descripcion: d.descripcion,
    metadata: d.metadata,
    ip: d.ip,
    userAgent: d.user_agent,
    creadoEn: d.creado_en,
    usuario: d.usuario ? { id: d.usuario.id, nombre: d.usuario.nombre, email: d.usuario.email, cargo: d.usuario.cargo } : null,
  };
}

function _enrichSesion(s) {
  const d = s.toJSON();
  return {
    id: d.id,
    usuarioId: d.usuario_id,
    inicio: d.inicio,
    fin: d.fin,
    duracionSeg: d.duracion_seg,
    ip: d.ip,
    userAgent: d.user_agent,
    dispositivo: d.dispositivo,
    navegador: d.navegador,
    sistemaOp: d.sistema_op,
    usuario: d.usuario ? { id: d.usuario.id, nombre: d.usuario.nombre, email: d.usuario.email, cargo: d.usuario.cargo } : null,
  };
}

async function historial({ usuarioId, tipo, desde, hasta, page = 1, limit = 50 }) {
  const where = {
    ...(usuarioId ? { usuario_id: usuarioId } : {}),
    ...(tipo && TIPOS_VALIDOS.has(tipo) ? { tipo } : {}),
    ...rangoFecha('creado_en', desde, hasta),
  };
  const limitReal = Math.min(limit, 200);
  const [total, actividades] = await Promise.all([
    ActividadUsuario.count({ where }),
    ActividadUsuario.findAll({
      where,
      include: [{ model: Usuario, as: 'usuario', attributes: USUARIO_ATTRS }],
      order: [['creado_en', 'DESC']],
      offset: (page - 1) * limitReal,
      limit: limitReal,
    }),
  ]);
  return { data: actividades.map(_enrichActividad), pagination: { page, limit: limitReal, total, totalPages: Math.ceil(total / limitReal) } };
}

async function sesiones({ usuarioId, desde, hasta, page = 1, limit = 50 }) {
  const where = { ...(usuarioId ? { usuario_id: usuarioId } : {}), ...rangoFecha('inicio', desde, hasta) };
  const limitReal = Math.min(limit, 200);
  const [total, filas] = await Promise.all([
    SesionUsuario.count({ where }),
    SesionUsuario.findAll({
      where,
      include: [{ model: Usuario, as: 'usuario', attributes: USUARIO_ATTRS }],
      order: [['inicio', 'DESC']],
      offset: (page - 1) * limitReal,
      limit: limitReal,
    }),
  ]);
  return { data: filas.map(_enrichSesion), pagination: { page, limit: limitReal, total, totalPages: Math.ceil(total / limitReal) } };
}

async function stats({ desde, hasta }) {
  const rangoDesde = desde ? new Date(desde) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rangoHasta = hasta ? new Date(hasta) : new Date();

  const [totalUsuarios, usuariosActivos, sesionesPeriodo, actividadesPorTipo, sesionesPorDia, duracionMediaSesion, horasPico] = await Promise.all([
    Usuario.count({ where: { activo: true } }),
    Usuario.count({ where: { activo: true, presencia_estado: { [Op.ne]: 'desconectado' } } }),
    SesionUsuario.findAll({ where: { inicio: { [Op.gte]: rangoDesde, [Op.lte]: rangoHasta } }, attributes: ['inicio', 'fin', 'duracion_seg', 'usuario_id'] }),
    ActividadUsuario.findAll({ where: { creado_en: { [Op.gte]: rangoDesde, [Op.lte]: rangoHasta } }, attributes: ['tipo', [fn('COUNT', col('tipo')), 'count']], group: ['tipo'] }),
    sequelize.query(
      `SELECT DATE_TRUNC('day', inicio)::date as dia, COUNT(*) as total FROM sesiones_usuario WHERE inicio >= $1 AND inicio <= $2 GROUP BY DATE_TRUNC('day', inicio) ORDER BY dia`,
      { bind: [rangoDesde, rangoHasta], type: sequelize.QueryTypes.SELECT }
    ),
    SesionUsuario.findOne({ where: { fin: { [Op.ne]: null }, inicio: { [Op.gte]: rangoDesde, [Op.lte]: rangoHasta } }, attributes: [[fn('AVG', col('duracion_seg')), 'promedio']], raw: true }),
    sequelize.query(
      `SELECT EXTRACT(HOUR FROM inicio)::int as hora, COUNT(*) as total FROM sesiones_usuario WHERE inicio >= $1 AND inicio <= $2 GROUP BY EXTRACT(HOUR FROM inicio) ORDER BY hora`,
      { bind: [rangoDesde, rangoHasta], type: sequelize.QueryTypes.SELECT }
    ),
  ]);

  const usuariosUnicosConSesion = new Set(sesionesPeriodo.map((s) => s.usuario_id)).size;
  const sesionesCompletadas = sesionesPeriodo.filter((s) => s.fin);
  const duracionMedia = duracionMediaSesion?.promedio ? Math.round(Number(duracionMediaSesion.promedio) / 60) : 0;

  return {
    resumen: {
      totalUsuarios,
      usuariosActivos,
      usuariosConSesion: usuariosUnicosConSesion,
      totalSesiones: sesionesPeriodo.length,
      sesionesCompletadas: sesionesCompletadas.length,
      duracionMediaMinutos: duracionMedia,
    },
    actividadesPorTipo: actividadesPorTipo.map((a) => ({ tipo: a.tipo, count: Number(a.get('count')) })),
    // El driver pg devuelve una columna `::date` como STRING "YYYY-MM-DD"
    // (no como Date -- a diferencia de una columna DATE/TIMESTAMP normal),
    // así que a diferencia del Prisma original (`d.dia.toISOString()...`)
    // acá `d.dia` ya viene listo, sin necesidad de reformatear.
    sesionesPorDia: sesionesPorDia.map((d) => ({ dia: d.dia, total: Number(d.total) })),
    horasPico: horasPico.map((h) => ({ hora: h.hora, total: Number(h.total) })),
    periodo: { desde: rangoDesde.toISOString(), hasta: rangoHasta.toISOString() },
  };
}

function csvRow(cols) {
  return cols.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
}

async function exportarCsv({ tipo, usuarioId, desde, hasta }) {
  if (tipo === 'actividades') {
    const where = { ...(usuarioId ? { usuario_id: usuarioId } : {}), ...rangoFecha('creado_en', desde, hasta) };
    const filas = await ActividadUsuario.findAll({ where, include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'email', 'cargo'] }], order: [['creado_en', 'DESC']], limit: 10000 });
    const headers = ['Fecha', 'Usuario', 'Email', 'Cargo', 'Tipo', 'Descripción', 'IP', 'User Agent', 'Metadata'];
    const rows = filas.map((a) => [a.creado_en.toISOString(), a.usuario.nombre, a.usuario.email, a.usuario.cargo || '', a.tipo, a.descripcion || '', a.ip || '', a.user_agent || '', a.metadata ? JSON.stringify(a.metadata) : '']);
    return { filename: `actividades_${new Date().toISOString().split('T')[0]}.csv`, csv: [csvRow(headers), ...rows.map(csvRow)].join('\n') };
  }
  if (tipo === 'sesiones') {
    const where = { ...(usuarioId ? { usuario_id: usuarioId } : {}), ...rangoFecha('inicio', desde, hasta) };
    const filas = await SesionUsuario.findAll({ where, include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'email', 'cargo'] }], order: [['inicio', 'DESC']], limit: 10000 });
    const headers = ['Usuario', 'Email', 'Cargo', 'Inicio', 'Fin', 'Duración (min)', 'IP', 'Dispositivo', 'Navegador', 'Sistema Op.'];
    const rows = filas.map((s) => [
      s.usuario.nombre,
      s.usuario.email,
      s.usuario.cargo || '',
      s.inicio.toISOString(),
      s.fin ? s.fin.toISOString() : 'En curso',
      s.duracion_seg ? String(Math.round(s.duracion_seg / 60)) : 'En curso',
      s.ip || '',
      s.dispositivo || '',
      s.navegador || '',
      s.sistema_op || '',
    ]);
    return { filename: `sesiones_${new Date().toISOString().split('T')[0]}.csv`, csv: [csvRow(headers), ...rows.map(csvRow)].join('\n') };
  }
  return null;
}

module.exports = { TIPOS_VALIDOS, historial, sesiones, stats, exportarCsv };
