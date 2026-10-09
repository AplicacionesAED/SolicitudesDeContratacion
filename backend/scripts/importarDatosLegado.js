// ⚠ CORTE ÚNICO, NO IDEMPOTENTE -- ya se corrió una vez (2026-08 sobre
// `solicitudes_indirectos_v2`) para el corte de producción. Volver a
// correrlo VACÍA TODAS las tablas de negocio (usuarios, solicitudes,
// terceros, etc.) y las repuebla desde cero con el snapshot ACTUAL de la
// base legada -- cualquier dato creado en `solicitudes_indirectos_v2`
// DESPUÉS del corte (una solicitud real nueva, un usuario nuevo) se PERDERÍA.
// Solo tiene sentido re-ejecutarlo si de verdad se necesita rehacer el corte
// completo desde cero, nunca como sincronización incremental.
//
// Fase 9 — importa los datos REALES de producción (`solicitudes-indirectos/`,
// Prisma, LEGACY_DATABASE_URL, SOLO LECTURA -- este script nunca ejecuta un
// INSERT/UPDATE/DELETE contra esa conexión) hacia esta base nueva
// (Sequelize, `solicitudes_indirectos_v2`).
//
// No es una copia cruda: el esquema cambió de raíz entre fases (camelCase
// Prisma -> snake_case Sequelize, JSON-string-en-TEXT -> JSONB nativo), así
// que cada tabla se lee del origen y se re-escribe con las columnas nuevas.
//
// Decisión explícita del usuario antes de correr esto: las tablas de negocio
// de `solicitudes_indirectos_v2` se VACÍAN primero (TRUNCATE ... RESTART
// IDENTITY CASCADE) -- hasta ahora solo tenían datos de seed/prueba de las
// Fases 1-8, nunca datos reales, así que no hay nada que reconciliar.
//
// Remapeo de IDs: Proyecto/Frente/Especialidad/Tercero/Solicitud usan Int
// autoincrement en AMBOS esquemas -- se preservan literalmente iguales (con
// setval() al final para que el próximo autoincrement no choque). User.id en
// el original es un cuid (String) -- Usuario.id acá es INTEGER autoincrement,
// así que es el ÚNICO caso que necesita una tabla de mapeo (legacy cuid ->
// id nuevo), construida al insertar usuarios y usada después en cualquier FK
// que apunte a un usuario (incluyendo los arrays de AprobadorFrente).
//
// Fechas: las columnas de "instante" (creadoEn/actualizadoEn/fecha/etc.) se
// pasan tal cual (ambos esquemas son timestamp, sin ambigüedad). Las de
// "solo fecha" del cronograma (CronogramaContrato/ActividadCronograma) se
// extraen con to_char(col, 'YYYY-MM-DD') directo desde Postgres en vez de
// dejar que el driver las convierta a un objeto Date de JS -- evitaría un
// corrimiento de día si se reformatearan después en la zona horaria del
// proceso (mismo gotcha ya documentado en cronograma.js de la Fase 5).
//
// Archivos subidos: `archivoCuadroComparativo`/`archivoCotizacion` son URLs
// a `/api/files/...` que viven en el volumen Docker de producción
// (`/app/data/uploads`), no en la base de datos. El usuario recuperó
// manualmente los de 2 de las 3 solicitudes reales (ver ARCHIVOS_REALES
// abajo) y los puso en SOLICITUDES/files/<consecutivo>/ -- este script los
// copia a backend/uploads/ con el mismo nombre "{timestamp}-{sanitizado}"
// que usa upload.controller.js, y reescribe la URL a "/files/...". La
// tercera (SOL-ODS-BK-KALIZA1-001) se perdió en producción -- pendiente de
// recuperar, así que por ahora conserva la URL vieja "/api/files/..." tal
// cual (rota hasta que se recupere el archivo real).
'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const sequelize = require('../src/config/db');
const { UPLOADS_DIR } = require('../src/modules/upload/upload.config');

const LEGACY_URL = process.env.LEGACY_DATABASE_URL;
if (!LEGACY_URL) {
  console.error('LEGACY_DATABASE_URL no está configurada en backend/.env');
  process.exit(1);
}

const FILES_DIR = path.join(__dirname, '..', '..', 'files');

// consecutivo -> { archivoCuadroComparativo: 'nombre local en files/<consecutivo>/', archivoCotizacion: '...' }
// Solo las 2 solicitudes cuyos archivos SÍ se pudieron recuperar del volumen
// de producción -- ver el comentario de arriba.
const ARCHIVOS_REALES = {
  'SOL-ODS-BK-KALA2-001': {
    archivoCuadroComparativo: 'CUADRO_COMPARATIVO_DR (3).xlsx',
    archivoCotizacion: 'PRIMEDEST_Cotizaci_n_Registro_Fotos_Drone_aed_Cesar_Hurtado_2_.pdf',
  },
  'SOL-ODS-BK-LAGUNAYAMBIENTAL-001': {
    archivoCuadroComparativo: 'RESUMEN_DE_LICITACI_N_-_ekimak (1).xlsx',
    archivoCotizacion: 'COTIZACION_BAIA_KRISTAL_04-08-2026.pdf',
  },
};

const TABLAS_A_VACIAR = [
  'usuarios', 'roles', 'proyectos', 'frentes', 'frente_usuarios', 'aprobador_frentes',
  'especialidades', 'terceros', 'tercero_especialidades', 'solicitudes',
  'historial_solicitudes', 'cronograma_contratos', 'fase_cronogramas', 'actividad_cronogramas',
  'notificaciones', 'contador_consecutivos', 'actividades_usuario', 'sesiones_usuario',
];

function copiarArchivoReal(consecutivo, campo, nombreLocal) {
  const origen = path.join(FILES_DIR, consecutivo, nombreLocal);
  if (!fs.existsSync(origen)) {
    console.warn(`  ⚠ No se encontró ${origen}, se deja sin adjunto`);
    return null;
  }
  const timestamp = Date.now() + Math.floor(Math.random() * 1000); // evita colisión entre los 2 archivos de la misma solicitud
  const safeName = nombreLocal.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/__+/g, '_').slice(0, 120);
  const filename = `${timestamp}-${safeName}`;
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.copyFileSync(origen, path.join(UPLOADS_DIR, filename));
  console.log(`  ✓ ${campo}: copiado a uploads/${filename}`);
  return `/files/${filename}`;
}

async function resetSequence(transaction, table, column = 'id') {
  await sequelize.query(
    `SELECT setval(pg_get_serial_sequence('${table}', '${column}'), COALESCE((SELECT MAX(${column}) FROM ${table}), 1), (SELECT MAX(${column}) FROM ${table}) IS NOT NULL)`,
    { transaction }
  );
}

async function main() {
  const legacy = new Client({ connectionString: LEGACY_URL });
  await legacy.connect();
  console.log('Conectado a la base legada (solo lectura).');

  // ── Lectura completa del origen (nunca se escribe en `legacy`) ────────────
  const [
    { rows: legacyUsers },
    { rows: legacyRoles },
    { rows: legacyProyectos },
    { rows: legacyFrentes },
    { rows: legacyFrenteUsuarios },
    { rows: legacyAprobadorFrentes },
    { rows: legacyEspecialidades },
    { rows: legacyTerceros },
    { rows: legacyTerceroEspecialidades },
    { rows: legacySolicitudes },
    { rows: legacyHistorial },
    { rows: legacyCronogramas },
    { rows: legacyFases },
    { rows: legacyActividadesCronograma },
    { rows: legacyNotificaciones },
    { rows: legacyContadores },
    { rows: legacyActividadesUsuario },
    { rows: legacySesiones },
  ] = await Promise.all([
    // Excluye las 8 cuentas semilla @baiak.com (smercado, crodriguez, ...,
    // admin@baiak.com) -- residuos del prisma/seed.ts original corrido una
    // vez contra producción antes de que se sumaran los usuarios reales. Ya
    // estaban `activo: false` en el origen; el usuario pidió explícitamente
    // que NO se migren (se habían migrado tal cual en la primera corrida y
    // se borraron a mano después).
    legacy.query(`SELECT * FROM "User" WHERE email NOT LIKE '%@baiak.com' ORDER BY "creadoEn" ASC`),
    legacy.query('SELECT * FROM "Rol"'),
    legacy.query('SELECT * FROM "Proyecto" ORDER BY id'),
    legacy.query('SELECT * FROM "Frente" ORDER BY id'),
    legacy.query('SELECT * FROM "FrenteUsuario"'),
    legacy.query('SELECT * FROM "AprobadorFrente" ORDER BY id'),
    legacy.query('SELECT * FROM "Especialidad" ORDER BY id'),
    legacy.query('SELECT * FROM "Tercero" ORDER BY id'),
    legacy.query('SELECT "A" AS especialidad_id, "B" AS tercero_id FROM "_TerceroEspecialidades"'),
    legacy.query('SELECT * FROM "Solicitud" ORDER BY id ASC'),
    legacy.query('SELECT * FROM "HistorialSolicitud" ORDER BY id ASC'),
    legacy.query(`SELECT id, "solicitudId", "tieneFases", to_char("fechaInicio",'YYYY-MM-DD') AS fecha_inicio, to_char("fechaFin",'YYYY-MM-DD') AS fecha_fin, "creadoEn" FROM "CronogramaContrato" ORDER BY id`),
    legacy.query(`SELECT id, "cronogramaId", "numeroFase", "nombreFase", to_char("fechaInicio",'YYYY-MM-DD') AS fecha_inicio, to_char("fechaFin",'YYYY-MM-DD') AS fecha_fin FROM "FaseCronograma" ORDER BY id`),
    legacy.query(`SELECT id, "cronogramaId", "faseId", descripcion, to_char("fechaInicio",'YYYY-MM-DD') AS fecha_inicio, to_char("fechaFin",'YYYY-MM-DD') AS fecha_fin, responsable FROM "ActividadCronograma" ORDER BY id`),
    legacy.query('SELECT * FROM "Notificacion" ORDER BY id'),
    legacy.query('SELECT * FROM "ContadorConsecutivo"'),
    legacy.query('SELECT * FROM "ActividadUsuario" ORDER BY id'),
    legacy.query('SELECT * FROM "SesionUsuario" ORDER BY id'),
  ]);
  await legacy.end();

  console.log(
    `Leídos: ${legacyUsers.length} usuarios, ${legacyRoles.length} roles, ${legacyProyectos.length} proyectos, ${legacyFrentes.length} frentes, ` +
    `${legacyEspecialidades.length} especialidades, ${legacyTerceros.length} terceros, ${legacySolicitudes.length} solicitudes, ` +
    `${legacyHistorial.length} historial, ${legacyNotificaciones.length} notificaciones, ${legacyActividadesUsuario.length} actividad, ${legacySesiones.length} sesiones.`
  );

  await sequelize.transaction(async (transaction) => {
    console.log('\nVaciando tablas de negocio (datos de seed/prueba)...');
    await sequelize.query(`TRUNCATE TABLE ${TABLAS_A_VACIAR.join(', ')} RESTART IDENTITY CASCADE`, { transaction });

    // ── Roles ────────────────────────────────────────────────────────────────
    console.log(`Insertando ${legacyRoles.length} roles...`);
    for (const r of legacyRoles) {
      await sequelize.query(
        `INSERT INTO roles (nombre, permisos, ver_todas_solicitudes, creado_en, actualizado_en)
         VALUES ($1, $2::jsonb, $3, $4, $5)`,
        { bind: [r.slug, r.funcionalidades, r.verTodasSolicitudes, r.creadoEn, r.actualizadoEn], transaction }
      );
    }

    // ── Usuarios (id remapeado: cuid -> integer) ────────────────────────────
    console.log(`Insertando ${legacyUsers.length} usuarios...`);
    const mapaUsuarios = new Map(); // legacy cuid -> id nuevo
    for (const u of legacyUsers) {
      const [rows] = await sequelize.query(
        `INSERT INTO usuarios (email, nombre, hashed_password, roles, funcionalidades_adicionales, cargo, telefono,
           microsoft_id, microsoft_email, ultima_conexion, ultima_actividad, presencia_estado, activo,
           debe_cambiar_password, creado_en, actualizado_en)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13, false, $14, $15)
         RETURNING id`,
        {
          // .toLowerCase() a mano: el modelo Sequelize normaliza el email en
          // su setter, pero este INSERT es SQL crudo y lo salta -- el login
          // (auth.service.js) compara en minúsculas, así que si no se hace
          // acá un usuario con mayúsculas en el email legado no podría
          // iniciar sesión después de la migración.
          bind: [
            u.email.toLowerCase(), u.nombre, u.password, u.roles, u.funcionalidadesAdicionales, u.cargo, u.telefono,
            u.microsoftId, u.microsoftEmail, u.ultimaConexion, u.ultimaActividad, u.presenciaEstado, u.activo,
            u.creadoEn, u.actualizadoEn,
          ],
          transaction,
        }
      );
      mapaUsuarios.set(u.id, rows[0].id);
    }
    const mapUsr = (cuid) => (cuid ? mapaUsuarios.get(cuid) ?? null : null);
    const mapUsrArrayJson = (jsonStr) => {
      let arr;
      try { arr = JSON.parse(jsonStr ?? '[]'); } catch { arr = []; }
      return JSON.stringify(arr.map(mapUsr).filter((id) => id != null));
    };

    // ── Proyectos (id preservado) ────────────────────────────────────────────
    console.log(`Insertando ${legacyProyectos.length} proyectos...`);
    for (const p of legacyProyectos) {
      await sequelize.query(
        `INSERT INTO proyectos (id, nombre, codigo_consecutivo, activo, creado_en, actualizado_en) VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        { bind: [p.id, p.nombre, p.codigoConsecutivo, p.activo], transaction }
      );
    }
    await resetSequence(transaction, 'proyectos');

    // ── Frentes (id preservado) ──────────────────────────────────────────────
    console.log(`Insertando ${legacyFrentes.length} frentes...`);
    for (const f of legacyFrentes) {
      await sequelize.query(
        `INSERT INTO frentes (id, nombre, etapa, proyecto_id, creado_en, actualizado_en) VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        { bind: [f.id, f.nombre, f.etapa, f.proyectoId], transaction }
      );
    }
    await resetSequence(transaction, 'frentes');

    // ── FrenteUsuario (usuario_id remapeado) ─────────────────────────────────
    console.log(`Insertando ${legacyFrenteUsuarios.length} asignaciones frente-usuario...`);
    for (const fu of legacyFrenteUsuarios) {
      const usuarioId = mapUsr(fu.userId);
      if (!usuarioId) { console.warn(`  ⚠ FrenteUsuario: usuario ${fu.userId} no encontrado, se omite`); continue; }
      await sequelize.query(`INSERT INTO frente_usuarios (usuario_id, frente_id) VALUES ($1, $2)`, { bind: [usuarioId, fu.frenteId], transaction });
    }

    // ── AprobadorFrente (id preservado, arrays de usuario remapeados) ───────
    console.log(`Insertando ${legacyAprobadorFrentes.length} configuraciones de aprobador por frente...`);
    for (const af of legacyAprobadorFrentes) {
      await sequelize.query(
        `INSERT INTO aprobador_frentes (id, frente_id, aprobador_ids, contratos_tramite_ids, contratos_minuta_ids, controles_id, director_controles_ids, creado_en, actualizado_en)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7::jsonb, NOW(), NOW())`,
        {
          bind: [
            af.id, af.frenteId,
            mapUsrArrayJson(af.aprobadorIds), mapUsrArrayJson(af.contratosTramiteIds), mapUsrArrayJson(af.contratosMinutaIds),
            mapUsr(af.controlesId), mapUsrArrayJson(af.directorControlesIds),
          ],
          transaction,
        }
      );
    }
    await resetSequence(transaction, 'aprobador_frentes');

    // ── Especialidades (id preservado) ──────────────────────────────────────
    console.log(`Insertando ${legacyEspecialidades.length} especialidades...`);
    for (const e of legacyEspecialidades) {
      await sequelize.query(
        `INSERT INTO especialidades (id, nombre, descripcion, creado_en, actualizado_en) VALUES ($1, $2, $3, $4, $5)`,
        { bind: [e.id, e.nombre, e.descripcion, e.creadoEn, e.actualizadoEn], transaction }
      );
    }
    await resetSequence(transaction, 'especialidades');

    // ── Terceros (id preservado) ─────────────────────────────────────────────
    console.log(`Insertando ${legacyTerceros.length} terceros...`);
    for (const t of legacyTerceros) {
      await sequelize.query(
        `INSERT INTO terceros (id, razon_social, nit, tipo_contrato, confidencialidad,
           representante_legal, cedula_representante, correo_firma, direccion_representante, telefono_representante,
           nombre_contacto, telefono_contacto, correo_contacto, fecha_vencimiento_sagrilaft,
           dd_identificacion_contraparte, dd_consulta_listas_restrictivas, dd_verificacion_pep,
           dd_conocimiento_negocio, dd_monitoreo_actualizacion, dd_senales_alerta_reporte, aprobado_debida_diligencia,
           creado_en, actualizado_en)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW(),NOW())`,
        {
          bind: [
            t.id, t.razonSocial, t.nit, t.tipoContrato, t.confidencialidad,
            t.representanteLegal, t.cedulaRepresentante, t.correoFirma, t.direccionRepresentante, t.telefonoRepresentante,
            t.nombreContacto, t.telefonoContacto, t.correoContacto, t.fechaVencimientoSagrilaft,
            t.dd_identificacionContraparte, t.dd_consultaListasRestrictivas, t.dd_verificacionPep,
            t.dd_conocimientoNegocio, t.dd_monitoreoActualizacion, t.dd_senalesAlertaReporte, t.aprobadoDebidaDiligencia,
          ],
          transaction,
        }
      );
    }
    await resetSequence(transaction, 'terceros');

    // ── TerceroEspecialidad (sin remapeo, ambos lados son Int) ──────────────
    console.log(`Insertando ${legacyTerceroEspecialidades.length} relaciones tercero-especialidad...`);
    for (const te of legacyTerceroEspecialidades) {
      await sequelize.query(`INSERT INTO tercero_especialidades (tercero_id, especialidad_id) VALUES ($1, $2)`, { bind: [te.tercero_id, te.especialidad_id], transaction });
    }

    // ── Solicitudes (id preservado, FKs de usuario remapeados) ──────────────
    console.log(`Insertando ${legacySolicitudes.length} solicitudes...`);
    for (const s of legacySolicitudes) {
      let archivoCuadroComparativo = s.archivoCuadroComparativo;
      let archivoCotizacion = s.archivoCotizacion;
      const reales = ARCHIVOS_REALES[s.consecutivo];
      if (reales) {
        console.log(` ${s.consecutivo}:`);
        const nuevaCuadro = copiarArchivoReal(s.consecutivo, 'archivoCuadroComparativo', reales.archivoCuadroComparativo);
        const nuevaCotizacion = copiarArchivoReal(s.consecutivo, 'archivoCotizacion', reales.archivoCotizacion);
        if (nuevaCuadro) archivoCuadroComparativo = nuevaCuadro;
        if (nuevaCotizacion) archivoCotizacion = nuevaCotizacion;
      }

      await sequelize.query(
        `INSERT INTO solicitudes (
           id, consecutivo, tipo, fecha_solicitud, solicitante_id, proyecto_id, frentes_ids, tercero_id,
           descripcion_actividad, plazo_ejecucion, forma_pago, valor_final, tipo_contrato, asunto,
           creacion_tercero, contratante_nombre, contratante_nit, alcance, terminos_referencia, condiciones_especiales, valor_en_letras,
           doc_terminos_referencia, doc_camara_comercio, doc_estados_financieros, doc_estado_resultados, doc_sagrilaft,
           doc_composicion_accionaria, doc_rut, doc_cedula_representante, doc_certificacion_bancaria, doc_cotizacion,
           archivo_cuadro_comparativo, archivo_cotizacion, archivo_formato_solicitud, archivo_pre_bep,
           archivo_generador_gastos, archivo_evaluacion_inicial, archivos_anexos,
           aprobador_id, fecha_aprobacion_director, responsable_contratos_tramite_id, responsable_contratos_minuta_id,
           coordinador_controles_id, director_controles_id, nota_contratacion, necesita_revision, numero_contrato_adpro,
           importado_historico, numero_otrosi, estado, solicitud_padre_id, creado_en, actualizado_en
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7::jsonb,$8,
           $9,$10,$11,$12,$13,$14,
           $15,$16,$17,$18,$19,$20,$21,
           $22,$23,$24,$25,$26,
           $27,$28,$29,$30,$31,
           $32,$33,$34,$35,
           $36,$37,$38::jsonb,
           $39,$40,$41,$42,
           $43,$44,$45,$46,$47,
           $48,$49,$50,$51,$52,$53
         )`,
        {
          bind: [
            s.id, s.consecutivo, s.tipo, s.fechaSolicitud, mapUsr(s.solicitanteId), s.proyectoId, s.frentesIds, s.terceroId,
            s.descripcionActividad, s.plazoEjecucion, s.formaPago, s.valorFinal, s.tipoContrato, s.asunto,
            s.creacionTercero, s.contratanteNombre, s.contratanteNit, s.alcance, s.terminosReferencia, s.condicionesEspeciales, s.valorEnLetras,
            s.docTerminosReferencia, s.docCamaraComercio, s.docEstadosFinancieros, s.docEstadoResultados, s.docSagrilaft,
            s.docComposicionAccionaria, s.docRut, s.docCedulaRepresentante, s.docCertificacionBancaria, s.docCotizacion,
            archivoCuadroComparativo, archivoCotizacion, s.archivoFormatoSolicitud, s.archivoPreBEP,
            s.archivoGeneradorGastos, s.archivoEvaluacionInicial, s.archivosAnexos,
            mapUsr(s.aprobadorId), s.fechaAprobacionDirector, mapUsr(s.responsableContratosTramiteId), mapUsr(s.responsableContratosMinutaId),
            mapUsr(s.coordinadorControlesId), mapUsr(s.directorControlesId), s.notaContratacion, s.necesitaRevision, s.numeroContratoAdpro,
            s.importadoHistorico, s.numeroOtrosi, s.estado, s.solicitudPadreId, s.creadoEn, s.actualizadoEn,
          ],
          transaction,
        }
      );
    }
    await resetSequence(transaction, 'solicitudes');

    // ── Historial (id preservado, usuario_id remapeado) ─────────────────────
    console.log(`Insertando ${legacyHistorial.length} entradas de historial...`);
    for (const h of legacyHistorial) {
      await sequelize.query(
        `INSERT INTO historial_solicitudes (id, solicitud_id, usuario_id, accion, nota, fecha) VALUES ($1,$2,$3,$4,$5,$6)`,
        { bind: [h.id, h.solicitudId, mapUsr(h.usuarioId), h.accion, h.nota, h.fecha], transaction }
      );
    }
    await resetSequence(transaction, 'historial_solicitudes');

    // ── Cronogramas (id preservado, fechas ya extraídas como 'YYYY-MM-DD') ──
    console.log(`Insertando ${legacyCronogramas.length} cronogramas...`);
    for (const c of legacyCronogramas) {
      await sequelize.query(
        `INSERT INTO cronograma_contratos (id, solicitud_id, tiene_fases, fecha_inicio, fecha_fin, creado_en) VALUES ($1,$2,$3,$4,$5,$6)`,
        { bind: [c.id, c.solicitudId, c.tieneFases, c.fecha_inicio, c.fecha_fin, c.creadoEn], transaction }
      );
    }
    await resetSequence(transaction, 'cronograma_contratos');

    console.log(`Insertando ${legacyFases.length} fases de cronograma...`);
    for (const f of legacyFases) {
      await sequelize.query(
        `INSERT INTO fase_cronogramas (id, cronograma_id, numero_fase, nombre_fase, fecha_inicio, fecha_fin) VALUES ($1,$2,$3,$4,$5,$6)`,
        { bind: [f.id, f.cronogramaId, f.numeroFase, f.nombreFase, f.fecha_inicio, f.fecha_fin], transaction }
      );
    }
    await resetSequence(transaction, 'fase_cronogramas');

    console.log(`Insertando ${legacyActividadesCronograma.length} actividades de cronograma...`);
    for (const a of legacyActividadesCronograma) {
      await sequelize.query(
        `INSERT INTO actividad_cronogramas (id, cronograma_id, fase_id, descripcion, fecha_inicio, fecha_fin, responsable) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        { bind: [a.id, a.cronogramaId, a.faseId, a.descripcion, a.fecha_inicio, a.fecha_fin, a.responsable], transaction }
      );
    }
    await resetSequence(transaction, 'actividad_cronogramas');

    // ── Notificaciones (id preservado, usuario_id remapeado) ────────────────
    console.log(`Insertando ${legacyNotificaciones.length} notificaciones...`);
    for (const n of legacyNotificaciones) {
      const usuarioId = mapUsr(n.userId);
      if (!usuarioId) { console.warn(`  ⚠ Notificacion ${n.id}: usuario ${n.userId} no encontrado, se omite`); continue; }
      await sequelize.query(
        `INSERT INTO notificaciones (id, usuario_id, titulo, mensaje, leida, url, creado_en) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        { bind: [n.id, usuarioId, n.titulo, n.mensaje, n.leida, n.url, n.creadoEn], transaction }
      );
    }
    await resetSequence(transaction, 'notificaciones');

    // ── ContadorConsecutivo (PK string, sin sequence) ───────────────────────
    console.log(`Insertando ${legacyContadores.length} contadores de consecutivo...`);
    for (const c of legacyContadores) {
      await sequelize.query(`INSERT INTO contador_consecutivos (tipo, anio, ultimo) VALUES ($1,$2,$3)`, { bind: [c.tipo, c.anio, c.ultimo], transaction });
    }

    // ── Actividad/Sesiones de usuario (id preservado, usuario_id remapeado) ─
    console.log(`Insertando ${legacyActividadesUsuario.length} registros de actividad de usuario...`);
    for (const a of legacyActividadesUsuario) {
      const usuarioId = mapUsr(a.userId);
      if (!usuarioId) continue;
      await sequelize.query(
        `INSERT INTO actividades_usuario (id, usuario_id, tipo, descripcion, metadata, ip, user_agent, creado_en) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8)`,
        { bind: [a.id, usuarioId, a.tipo, a.descripcion, a.metadata != null ? JSON.stringify(a.metadata) : null, a.ip, a.userAgent, a.creadoEn], transaction }
      );
    }
    await resetSequence(transaction, 'actividades_usuario');

    console.log(`Insertando ${legacySesiones.length} sesiones de usuario...`);
    for (const s of legacySesiones) {
      const usuarioId = mapUsr(s.userId);
      if (!usuarioId) continue;
      await sequelize.query(
        `INSERT INTO sesiones_usuario (id, usuario_id, inicio, fin, duracion_seg, ip, user_agent, dispositivo, navegador, sistema_op) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        { bind: [s.id, usuarioId, s.inicio, s.fin, s.duracionSeg, s.ip, s.userAgent, s.dispositivo, s.navegador, s.sistemaOp], transaction }
      );
    }
    await resetSequence(transaction, 'sesiones_usuario');

    console.log('\nTodo insertado dentro de la transacción -- confirmando...');
  });

  console.log('✓ Migración completada.');
  await sequelize.close();
}

main().catch((e) => {
  console.error('✗ Migración abortada, nada se confirmó (transacción revertida):', e);
  process.exit(1);
});
