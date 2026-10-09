// Puerto de api/solicitudes/[id]/cronograma/route.ts -- upsert (POST/PUT
// hacen lo mismo): borra el cronograma existente y lo recrea completo dentro
// de una transacción (fases + actividades en cascada). La regla de negocio
// más importante de este archivo es la de "días hábiles mínimos" (13 para
// CONTRATO, 2 para ORDEN_SERVICIO) -- ver utils/holidays.js.
const asyncHandler = require('../../utils/asyncHandler');
const { created } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const sequelize = require('../../config/db');
const { getMinStartDate } = require('../../utils/holidays');
const Solicitud = require('./solicitud.model');
const CronogramaContrato = require('./cronogramaContrato.model');
const FaseCronograma = require('./faseCronograma.model');
const ActividadCronograma = require('./actividadCronograma.model');
const { getRolesPorCodigo } = require('../../utils/permisos');

function esFechaValida(s) {
  if (!s) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

const upsertCronograma = asyncHandler(async (req, res) => {
  const numId = Number(req.params.id);
  if (!Number.isInteger(numId)) throw new ApiError(400, 'ID inválido');

  const solicitud = await Solicitud.findByPk(numId, { include: [{ model: Solicitud, as: 'solicitudPadre' }] });
  if (!solicitud) throw new ApiError(404, 'Solicitud no encontrada');

  // Solo el solicitante o CONTRATOS/ADMIN pueden fijar/reemplazar el
  // cronograma. Resuelto por código, no por el string 'CONTRATOS' a secas
  // (2026-09-18) -- ver utils/permisos.js#getRolesPorCodigo.
  const userId = req.usuario.id;
  const userRoles = req.usuario.roles ?? [];
  const nombreContratos = (await getRolesPorCodigo()).CONTRATOS;
  if (solicitud.solicitante_id !== Number(userId) && !userRoles.includes(nombreContratos) && !req.usuario.esAdmin) {
    throw new ApiError(403, 'No tienes permiso para modificar el cronograma de esta solicitud');
  }

  const { tieneFases, fechaInicio, fechaFin, fases, actividades } = req.body;
  if (!fechaInicio || !fechaFin) throw new ApiError(400, 'fechaInicio y fechaFin son obligatorios');

  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) throw new ApiError(400, 'Fechas inválidas');
  if (fin <= inicio) throw new ApiError(400, 'fechaFin debe ser posterior a fechaInicio');

  // Si es un otrosí, la regla de días mínimos mira el tipo del padre.
  const effectiveTipo = solicitud.tipo.startsWith('OTROSI_') ? (solicitud.solicitudPadre?.tipo ?? solicitud.tipo) : solicitud.tipo;
  const minDays = effectiveTipo === 'ORDEN_SERVICIO' ? 2 : 13;
  const minStart = getMinStartDate(minDays);
  const minStartDay = new Date(minStart);
  minStartDay.setHours(0, 0, 0, 0);
  const inicioDay = new Date(inicio);
  inicioDay.setHours(0, 0, 0, 0);

  // ADMIN puede guardar cronogramas con fechas pasadas (ej. editando solicitudes viejas).
  if (inicioDay < minStartDay && !req.usuario.esAdmin) {
    throw new ApiError(400, `La fecha de inicio debe ser al menos ${minDays} días hábiles desde hoy (mínimo: ${minStart.toISOString().split('T')[0]})`);
  }

  const cronogramaId = await sequelize.transaction(async (transaction) => {
    const existente = await CronogramaContrato.findOne({ where: { solicitud_id: numId }, transaction });
    if (existente) await existente.destroy({ transaction }); // cascade borra fases/actividades

    // OJO: nunca pasar los objetos Date `inicio`/`fin` (solo sirven para la
    // validación de arriba) a una columna DATEONLY -- Sequelize los formatea
    // en la zona horaria LOCAL del proceso, y `new Date('2026-09-15')` es
    // medianoche UTC, que en America/Bogota (UTC-5) cae en el día anterior.
    // El string 'YYYY-MM-DD' tal cual del body es lo único seguro acá (mismo
    // gotcha que "Fechas" en ARQUITECTURA-BACKEND.md, encontrado de nuevo al
    // portar este endpoint).
    const creado = await CronogramaContrato.create({ solicitud_id: numId, tiene_fases: Boolean(tieneFases), fecha_inicio: fechaInicio, fecha_fin: fechaFin }, { transaction });

    if (tieneFases && Array.isArray(fases) && fases.length > 0) {
      for (const fase of fases) {
        if (!esFechaValida(fase.fechaInicio) || !esFechaValida(fase.fechaFin)) continue;
        const faseCreada = await FaseCronograma.create(
          { cronograma_id: creado.id, numero_fase: fase.numeroFase, nombre_fase: fase.nombreFase, fecha_inicio: fase.fechaInicio, fecha_fin: fase.fechaFin },
          { transaction }
        );
        const validas = (fase.actividades ?? []).filter((a) => esFechaValida(a.fechaInicio) && esFechaValida(a.fechaFin));
        if (validas.length > 0) {
          await ActividadCronograma.bulkCreate(
            validas.map((a) => ({ cronograma_id: creado.id, fase_id: faseCreada.id, descripcion: a.descripcion, fecha_inicio: a.fechaInicio, fecha_fin: a.fechaFin, responsable: a.responsable ?? null })),
            { transaction }
          );
        }
      }
    } else if (!tieneFases) {
      const validas = (actividades ?? []).filter((a) => esFechaValida(a.fechaInicio) && esFechaValida(a.fechaFin));
      if (validas.length > 0) {
        await ActividadCronograma.bulkCreate(
          validas.map((a) => ({ cronograma_id: creado.id, fase_id: null, descripcion: a.descripcion, fecha_inicio: a.fechaInicio, fecha_fin: a.fechaFin, responsable: a.responsable ?? null })),
          { transaction }
        );
      }
    }

    return creado.id;
  });

  const cronograma = await CronogramaContrato.findByPk(cronogramaId, {
    include: [
      { model: FaseCronograma, as: 'fases', separate: true, order: [['numero_fase', 'ASC']], include: [{ model: ActividadCronograma, as: 'actividades', separate: true, order: [['id', 'ASC']] }] },
      { model: ActividadCronograma, as: 'actividades', separate: true, where: { fase_id: null }, required: false, order: [['fecha_inicio', 'ASC']] },
    ],
  });

  created(res, cronograma);
});

module.exports = { upsertCronograma };
