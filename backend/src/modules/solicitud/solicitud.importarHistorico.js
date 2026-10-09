// Puerto de api/solicitudes/importar-historico/route.ts -- registra un
// otrosí o un trámite viejo (Cuenta, Facturas, etc.) anterior a este
// sistema, ya COMPLETADA, para poder crear otrosís reales sobre él más
// adelante. No pasa por la máquina de estados (solicitud.estado.js) -- nace
// directo en COMPLETADA con importado_historico=true.
//
// 2026-09-25: importar un Contrato/Orden de Servicio histórico se movió a
// un flujo distinto -- SolicitudForm.jsx#esHistorico ahora crea el registro
// como BORRADOR normal (vía POST /solicitudes con importadoHistorico=true,
// solicitud.service.js#crearNormal) para poder guardarlo como borrador y
// volver a editarlo, y lo completa con
// POST /solicitudes/:id/completar-historico (solicitud.service.js#completarHistorico)
// en vez de este endpoint -- Contrato/Orden de Servicio ya NO pasan por
// acá. Este archivo se quedó solo con lo que nunca tuvo un formulario
// "normal" real (Otrosí histórico, Trámite viejo sin wizard propio) y por
// eso tampoco necesita el paso intermedio de borrador -- se completan de
// una sola vez, igual que siempre.
const { Op } = require('sequelize');
const asyncHandler = require('../../utils/asyncHandler');
const { created } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const sequelize = require('../../config/db');
const { getRolesFuncionalidades } = require('../../utils/permisos');
const { tieneCrearSolicitudes } = require('./solicitud.autorizacion');
const Solicitud = require('./solicitud.model');
const HistorialSolicitud = require('./historialSolicitud.model');
const CronogramaContrato = require('./cronogramaContrato.model');
const Frente = require('../frente/frente.model');
const Tercero = require('../tercero/tercero.model');
const solicitudService = require('./solicitud.service');
const { generarConsecutivo } = require('./solicitud.consecutivo');
const { pickMostRecentOtrosi } = require('./solicitud.otrosi');

const TIPOS_CONTRATO_HISTORICO = ['TRAMITE_CUENTA', 'TRAMITE_FACTURAS', 'TRAMITE_CUENTAS_RECURRENTES', 'TRAMITE_CUENTAS_OCASIONALES', 'TRAMITE_BONIFICACIONES_COMISIONES'];
const TIPOS_OTROSI_HISTORICO = ['OTROSI_TIEMPO', 'OTROSI_TIEMPO_CANTIDAD'];

const importar = asyncHandler(async (req, res) => {
  const funcionalidadesPorRol = await getRolesFuncionalidades();

  const { modo, tipo, categoria, terceroId, proyectoId, frentesIds, valorFinal, valorEnLetras, fechaInicio, fechaFin, solicitudPadreId, numeroOtrosi: numeroOtrosiInput } = req.body;
  if (categoria !== 'DIRECTA' && categoria !== 'INDIRECTA') throw new ApiError(400, 'categoria debe ser DIRECTA o INDIRECTA');

  if (!tieneCrearSolicitudes(req.usuario, categoria, funcionalidadesPorRol)) {
    throw new ApiError(403, 'No tienes permiso para crear solicitudes de esta categoría.');
  }

  if (modo !== 'CONTRATO' && modo !== 'OTROSI') throw new ApiError(400, 'modo debe ser CONTRATO u OTROSI');
  if (!fechaInicio || !fechaFin) throw new ApiError(400, 'fechaInicio y fechaFin son obligatorios');

  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) throw new ApiError(400, 'Fechas inválidas');
  if (fin <= inicio) throw new ApiError(400, 'fechaFin debe ser posterior a fechaInicio');

  // ── Modo OTROSI ────────────────────────────────────────────────────────────
  if (modo === 'OTROSI') {
    if (!tipo || !TIPOS_OTROSI_HISTORICO.includes(tipo)) throw new ApiError(400, 'Tipo inválido para otrosí histórico');
    if (!solicitudPadreId) throw new ApiError(400, 'solicitudPadreId es obligatorio en modo OTROSI');

    const numeroOtrosiManual = Number(numeroOtrosiInput);
    if (!numeroOtrosiInput || !Number.isInteger(numeroOtrosiManual) || numeroOtrosiManual <= 0) {
      throw new ApiError(400, 'numeroOtrosi debe ser un entero positivo');
    }

    const parent = await Solicitud.findByPk(Number(solicitudPadreId));
    if (!parent) throw new ApiError(404, 'Solicitud padre no encontrada');
    if (parent.tipo === 'ORDEN_SERVICIO') throw new ApiError(400, 'Las Órdenes de Servicio no admiten otrosí');
    if (parent.estado !== 'COMPLETADA') throw new ApiError(400, 'Solo se pueden importar otrosís de solicitudes en estado COMPLETADA');
    if (categoria !== parent.categoria) throw new ApiError(400, 'La categoría no coincide con la del contrato padre');

    const activeOtrosi = await Solicitud.findOne({ where: { solicitud_padre_id: parent.id, estado: { [Op.ne]: 'COMPLETADA' } }, attributes: ['consecutivo'] });
    if (activeOtrosi) {
      throw new ApiError(400, `Ya existe un otrosí activo para este contrato (${activeOtrosi.consecutivo}). Debe completarse antes de importar uno nuevo.`);
    }

    const completedOtrosis = await Solicitud.findAll({ where: { solicitud_padre_id: parent.id, estado: 'COMPLETADA' }, attributes: ['valor_final', 'valor_en_letras', 'numero_otrosi', 'creado_en'] });
    const baseline = pickMostRecentOtrosi(completedOtrosis) ?? parent;

    // valorEnLetras SIEMPRE lo calcula el frontend y viaja en el body -- mismo
    // criterio que solicitud.service.js#crearOtrosi (nunca se recalcula del
    // lado del backend, no existe un puerto de numeroALetras acá).
    const finalValorFinal = tipo === 'OTROSI_TIEMPO_CANTIDAD' && valorFinal != null ? Number(valorFinal) : baseline.valor_final;
    const finalValorEnLetras = tipo === 'OTROSI_TIEMPO_CANTIDAD' && valorFinal != null ? (valorEnLetras ?? null) : baseline.valor_en_letras;

    const frentesIdsParent = parent.frentes_ids ?? [];
    const firstFrenteId = frentesIdsParent[0];

    const creada = await sequelize.transaction(async (transaction) => {
      const consecutivo = await generarConsecutivo(tipo, parent.categoria, parent.proyecto_id, firstFrenteId, transaction);

      const nueva = await Solicitud.create(
        {
          consecutivo,
          tipo,
          categoria: parent.categoria,
          solicitud_padre_id: parent.id,
          numero_otrosi: numeroOtrosiManual,
          proyecto_id: parent.proyecto_id,
          frentes_ids: frentesIdsParent,
          solicitante_id: req.usuario.id,
          aprobador_id: parent.aprobador_id,
          responsable_contratos_tramite_id: parent.responsable_contratos_tramite_id,
          responsable_contratos_minuta_id: parent.responsable_contratos_minuta_id,
          coordinador_controles_id: parent.coordinador_controles_id,
          director_controles_id: parent.director_controles_id,
          estado: 'COMPLETADA',
          importado_historico: true,
          tercero_id: parent.tercero_id,
          descripcion_actividad: parent.descripcion_actividad,
          plazo_ejecucion: parent.plazo_ejecucion,
          forma_pago: parent.forma_pago,
          valor_final: finalValorFinal ?? null,
          valor_en_letras: finalValorEnLetras ?? null,
          tipo_contrato: parent.tipo_contrato,
          asunto: parent.asunto,
          contratante_nombre: parent.contratante_nombre,
          contratante_nit: parent.contratante_nit,
        },
        { transaction }
      );

      await CronogramaContrato.create({ solicitud_id: nueva.id, tiene_fases: false, fecha_inicio: fechaInicio, fecha_fin: fechaFin }, { transaction });

      await HistorialSolicitud.create(
        { solicitud_id: nueva.id, usuario_id: req.usuario.id, accion: 'IMPORTAR_HISTORICO', nota: `Otrosí histórico (n.º ${numeroOtrosiManual}) importado por ${req.usuario.nombre ?? 'un usuario'}.`, estado_resultante: 'COMPLETADA' },
        { transaction }
      );

      return nueva;
    });

    return created(res, await solicitudService.getById(creada.id, req.usuario));
  }

  // ── Modo CONTRATO (trámites viejos sin formulario propio) ──────────────────
  if (!tipo || !TIPOS_CONTRATO_HISTORICO.includes(tipo)) throw new ApiError(400, 'Tipo inválido para contrato histórico');
  if (!terceroId || !proyectoId || !Array.isArray(frentesIds) || frentesIds.length === 0) {
    throw new ApiError(400, 'terceroId, proyectoId y frentesIds son obligatorios');
  }

  const firstFrenteId = Number(frentesIds[0]);
  const [frente, tercero] = await Promise.all([
    Frente.findByPk(firstFrenteId, { attributes: ['id', 'proyecto_id'] }),
    Tercero.findByPk(Number(terceroId), { attributes: ['id'] }),
  ]);
  if (!frente) throw new ApiError(404, 'Frente no encontrado');
  if (frente.proyecto_id !== Number(proyectoId)) throw new ApiError(400, 'El frente seleccionado no pertenece al proyecto indicado');
  if (!tercero) throw new ApiError(404, 'Tercero no encontrado');

  // Mismo criterio que la creación normal (crearNormal), para que los
  // otrosís reales que se creen después sobre este contrato queden
  // asignados y notifiquen a alguien.
  const responsables = await solicitudService.resolverResponsablesFrente(firstFrenteId, categoria, req.usuario);

  const creada = await sequelize.transaction(async (transaction) => {
    const consecutivo = await generarConsecutivo(tipo, categoria, Number(proyectoId), firstFrenteId, transaction);

    const nueva = await Solicitud.create(
      {
        consecutivo,
        tipo,
        categoria,
        proyecto_id: Number(proyectoId),
        frentes_ids: frentesIds.map(Number),
        solicitante_id: req.usuario.id,
        ...responsables,
        estado: 'COMPLETADA',
        importado_historico: true,
        tercero_id: Number(terceroId),
        valor_final: valorFinal != null ? Number(valorFinal) : null,
        valor_en_letras: valorFinal != null ? (valorEnLetras ?? null) : null,
      },
      { transaction }
    );

    await CronogramaContrato.create({ solicitud_id: nueva.id, tiene_fases: false, fecha_inicio: fechaInicio, fecha_fin: fechaFin }, { transaction });

    await HistorialSolicitud.create(
      { solicitud_id: nueva.id, usuario_id: req.usuario.id, accion: 'IMPORTAR_HISTORICO', nota: `Contrato histórico importado por ${req.usuario.nombre ?? 'un usuario'}.`, estado_resultante: 'COMPLETADA' },
      { transaction }
    );

    return nueva;
  });

  created(res, await solicitudService.getById(creada.id, req.usuario));
});

module.exports = { importar };
