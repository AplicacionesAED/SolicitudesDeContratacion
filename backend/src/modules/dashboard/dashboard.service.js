// Puerto de (app)/dashboard/page.tsx -- la fuente REAL de los KPIs que veía
// el usuario (Server Component, sin fetch). api/dashboard/stats/route.ts
// existía en el original con una lógica casi idéntica pero NADA en el
// frontend lo llamaba nunca (confirmado por búsqueda en el código fuente) --
// código muerto, no se porta; esta es la única fuente de verdad ahora,
// expuesta como endpoint real porque acá SÍ hace falta (SPA, no SSR).
const { Op } = require('sequelize');
const { getRolesAlcanceSolicitudes, resolverAlcanceSolicitudes } = require('../../utils/permisos');
const Solicitud = require('../solicitud/solicitud.model');
const Frente = require('../frente/frente.model');
const { usuarioTieneAlgunFrente } = require('../solicitud/solicitud.service');
const { puedeEjecutarAccion } = require('../solicitud/solicitud.autorizacion');

const ESTADOS_ACTIVOS = ['ENVIADA', 'APROBADA_DIRECTOR', 'EN_PROYECCION_CONTROLES', 'EN_REVISION', 'EN_TRAMITE_CONTRATOS', 'CREACION_MINUTA', 'ENVIO_CONTRATO_POLIZAS', 'EN_CONTROLES', 'APROBACION_FINAL', 'PENDIENTE_GERENTE_COMPRAS'];

const CAMPOS_CANDIDATAS = ['id', 'estado', 'solicitante_id', 'aprobador_id', 'responsable_contratos_tramite_id', 'responsable_contratos_minuta_id', 'coordinador_controles_id', 'director_controles_id', 'frentes_ids', 'actualizado_en'];

// Estado -> la acción de APROBACIÓN que corresponde a ese paso (nunca
// DEVOLVER/REVISAR/ANULAR/REENVIAR -- esas son vías alternas, no "lo que
// este usuario debe aprobar ahora"). Usado por contarPendientesMiAprobacion
// para saber, por cada solicitud candidata, contra qué acción preguntarle
// a puedeEjecutarAccion.
const ACCION_PRINCIPAL_POR_ESTADO = {
  PENDIENTE_DIRECTOR_TECNICO: 'APROBAR_DIRECTOR_TECNICO',
  ENVIADA: 'APROBAR_DIRECTOR',
  // Doble paso del Residente Administrativo en Directa (2026-09-21): entre la
  // aprobación del Director de Obra y la proyección de Controles, la
  // solicitud queda acá y quien debe actuar es el Residente Administrativo
  // (mismo slot que REGISTRAR_ADPRO). No entra a ESTADOS_ACTIVOS a propósito
  // -- es un paso intermedio del flujo Directa, igual que
  // PENDIENTE_DIRECTOR_TECNICO para las aprobaciones previas. El contador
  // "pendientes por mi aprobación" del Residente Administrativo se arma con
  // Object.keys(ACCION_PRINCIPAL_POR_ESTADO) + CAMPOS_PENDIENTES (que ya
  // incluye responsable_residente_administrativo_id), así cae gratis.
  PENDIENTE_RESIDENTE_ADMINISTRATIVO: 'APROBAR_RESIDENTE_ADMINISTRATIVO',
  EN_PROYECCION_CONTROLES: 'APROBAR_PROYECCION',
  APROBADA_DIRECTOR: 'TRAMITAR_OK',
  EN_TRAMITE_CONTRATOS: 'TRAMITAR_OK',
  CREACION_MINUTA: 'AVANZAR_CONTRATOS',
  EN_CONTROLES: 'REGISTRAR_ADPRO',
  APROBACION_FINAL: 'APROBAR_FINAL',
  // Paso nuevo AL FINAL del flujo Directa (2026-10-09) -- mismo criterio
  // que PENDIENTE_RESIDENTE_ADMINISTRATIVO: cae gratis vía
  // Object.keys(ACCION_PRINCIPAL_POR_ESTADO) + CAMPOS_PENDIENTES (que ya
  // incluye responsable_gerente_compras_id).
  PENDIENTE_GERENTE_COMPRAS: 'APROBAR_GERENTE_COMPRAS',
};

// Todas las columnas que puedeEjecutarAccion/SNAPSHOT_POR_SLOT pueden
// necesitar leer, para las 2 categorías y los 10 slots -- ver
// solicitud.autorizacion.js.
const CAMPOS_PENDIENTES = [
  'id',
  'estado',
  'categoria',
  'frentes_ids',
  'aprobador_id',
  'responsable_contratos_tramite_id',
  'responsable_contratos_minuta_id',
  'director_controles_id',
  'coordinador_controles_id',
  'responsable_controles_proyeccion_id',
  'responsable_residente_administrativo_id',
  'responsable_controles_aprobacion_final_id',
  'responsable_director_obra_id',
  'responsable_gerente_compras_id',
];

// Mismo criterio de visibilidad que solicitud.service.js#list ("alcance de
// solicitudes en 3 niveles": PROPIAS/FRENTE/TODAS) -- el original de
// page.tsx solo miraba solicitanteId (calculaba userFrenteIds pero nunca
// los usaba en el where, código muerto real en el Next.js), lo que hacía
// que un DIRECTOR_PROYECTO o alguien con un frente asignado viera "0
// activas" en el Dashboard aunque esas mismas solicitudes SÍ aparecieran en
// /solicitudes (Fase 4 ya corrigió ese mismo tipo de hueco ahí). Se corrige
// acá también para que ambas pantallas cuenten lo mismo.
async function filtrarVisibles(solicitudes, usuario) {
  const alcancePorRol = await getRolesAlcanceSolicitudes();
  const alcance = resolverAlcanceSolicitudes(usuario.roles ?? [], alcancePorRol);
  const userId = Number(usuario.id);

  if (alcance === 'TODAS') return solicitudes;
  if (alcance === 'PROPIAS') return solicitudes.filter((s) => s.solicitante_id === userId);

  const userFrenteIds = await usuarioTieneAlgunFrente(userId);
  return solicitudes.filter(
    (s) =>
      s.solicitante_id === userId ||
      s.aprobador_id === userId ||
      s.responsable_contratos_tramite_id === userId ||
      s.responsable_contratos_minuta_id === userId ||
      s.coordinador_controles_id === userId ||
      s.director_controles_id === userId ||
      (s.frentes_ids ?? []).some((id) => userFrenteIds.includes(id))
  );
}

// 2026-09-18, segunda vuelta: esta función contaba "por rol a secas" (ej.
// CUALQUIER usuario con rol Contratos veía TODAS las EN_TRAMITE_CONTRATOS
// del sistema, sin importar si esa solicitud es de un frente donde
// realmente es responsable) -- imprecisión documentada y aceptada durante
// el refactor de "eliminar permisos de rol para solicitudes" (2026-09-02),
// que dejó la AUTORIZACIÓN real 100% basada en AprobadorFrente pero nunca
// volvió a este KPI para que contara lo mismo. Ahora reusa
// `puedeEjecutarAccion` -- la MISMA función que decide si el botón
// "Aprobar"/"Registrar Adpro"/etc. aparece en el detalle de una solicitud
// puntual -- así este número es exactamente "cuántas solicitudes tienen un
// botón de aprobación para MÍ ahora mismo", sin duplicar ningún criterio
// de autorización a mano. De paso, esto también lo vuelve inmune a
// renombrar roles (puedeEjecutarAccion nunca compara por nombre de rol
// para las acciones de aprobación, solo para ENVIAR/REENVIAR, que no
// entran acá) y ya sabe distinguir Directa/Indirecta (ej. Registrar Adpro
// en Directa lo autoriza Residente Administrativo, en Indirecta Controles)
// sin que este archivo tenga que saberlo.
async function contarPendientesMiAprobacion(usuario) {
  if (usuario.esAdmin) {
    return Solicitud.count({ where: { estado: { [Op.in]: ESTADOS_ACTIVOS } } });
  }

  const estados = Object.keys(ACCION_PRINCIPAL_POR_ESTADO);
  const candidatas = await Solicitud.findAll({ where: { estado: { [Op.in]: estados } }, attributes: CAMPOS_PENDIENTES });

  let total = 0;
  for (const s of candidatas) {
    const accion = ACCION_PRINCIPAL_POR_ESTADO[s.estado];
    if (await puedeEjecutarAccion(s, usuario, accion)) total++;
  }
  return total;
}

async function stats(usuario) {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);

  const candidatas = await Solicitud.findAll({ where: { solicitud_padre_id: null }, attributes: CAMPOS_CANDIDATAS });
  const visibles = await filtrarVisibles(candidatas, usuario);

  const totalActivas = visibles.filter((s) => ESTADOS_ACTIVOS.includes(s.estado)).length;
  const enRevision = visibles.filter((s) => s.estado === 'EN_REVISION').length;
  const completadasEsteMes = visibles.filter((s) => s.estado === 'COMPLETADA' && s.actualizado_en >= inicioMes && s.actualizado_en <= finMes).length;
  const pendientesMiAprobacion = await contarPendientesMiAprobacion(usuario);

  return { totalActivas, pendientesMiAprobacion, enRevision, completadasEsteMes };
}

async function recientes(usuario, limit = 10) {
  const candidatas = await Solicitud.findAll({
    where: { solicitud_padre_id: null },
    include: [
      { association: 'solicitante', attributes: ['nombre'] },
      { association: 'tercero', attributes: ['razon_social'] },
    ],
    order: [['fecha_solicitud', 'DESC']],
  });
  // `filtrarVisibles` ya devuelve todo sin filtrar cuando el alcance es
  // 'TODAS' -- no hace falta repetir ese chequeo acá (redundancia real que
  // tenía este archivo antes de "alcance de solicitudes en 3 niveles").
  const visibles = await filtrarVisibles(candidatas, usuario);
  const top = visibles.slice(0, limit);

  const todosFrenteIds = [...new Set(top.flatMap((s) => s.frentes_ids ?? []))];
  const frentesMap = todosFrenteIds.length
    ? Object.fromEntries((await Frente.findAll({ where: { id: todosFrenteIds }, attributes: ['id', 'nombre'] })).map((f) => [f.id, f.nombre]))
    : {};

  return top.map((s) => ({
    id: s.id,
    consecutivo: s.consecutivo,
    tipo: s.tipo,
    frentesNombres: (s.frentes_ids ?? []).map((id) => frentesMap[id]).filter(Boolean),
    estado: s.estado,
    fechaSolicitud: s.fecha_solicitud,
    numeroContratoAdpro: s.numero_contrato_adpro,
    solicitanteNombre: s.solicitante?.nombre ?? null,
    terceroRazonSocial: s.tercero?.razon_social ?? null,
  }));
}

module.exports = { stats, recientes };
