// Reconstruye la base de PRODUCCIÓN NUEVA a partir de v2 (la base real) más las
// solicitudes de la app vieja (v1) que ya estaban cargadas en el destino.
//
// ⚠ DESTRUCTIVO sobre el destino: lo VACÍA y lo vuelve a llenar, todo dentro de
// UNA transacción (si algo falla se revierte y el destino queda como estaba).
// Nunca escribe en v2. Úsalo solo contra la base nueva de producción.
//
// Uso (desde backend/):
//   DESTINO_URL="postgres://usuario:clave@host:puerto/base" node scripts/rehacerBaseProduccion.js
// v2 se lee con las PG* del backend/.env (solo lectura).
//
// Qué hace:
//  1. Guarda en memoria las solicitudes que el destino ya tiene (vienen de v1,
//     ya migradas al esquema actual) con su historial y cronograma.
//  2. Vacía el destino y copia v2 completa (todas las tablas menos SequelizeMeta).
//  3. Quita fixtures de pruebas de v2 (usuario ztest, contadores ZTEST).
//  4. Reemplaza las solicitudes INDIRECTAS de v2 por las de v1, remapeando
//     usuarios por correo y terceros por razón social + NIT.
//  5. Ajusta contadores de consecutivo y secuencias de ids.
require('dotenv').config();
const { Client } = require('pg');

const DESTINO_URL = process.env.DESTINO_URL;
if (!DESTINO_URL) {
  console.error('Falta DESTINO_URL (URL de la base de producción nueva).');
  process.exit(1);
}
const { PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE } = process.env;
const V2 = new Client({
  connectionString: `postgres://${encodeURIComponent(PGUSER)}:${encodeURIComponent(PGPASSWORD)}@${PGHOST}:${PGPORT || 5432}/${PGDATABASE}`,
});
const D = new Client({ connectionString: DESTINO_URL });

const rows = async (c, s, p) => (await c.query(s, p)).rows;
const USER_COLS = /^(solicitante|aprobador|responsable|coordinador|director|controles|residente|gerente).*_id$/;

(async () => {
  try {
    await V2.connect();
  } catch (e) {
    console.error('No se pudo conectar a v2 (PG* del backend/.env):', e.message);
    process.exit(1);
  }
  try {
    await D.connect();
  } catch (e) {
    console.error('No se pudo conectar al DESTINO (revisa DESTINO_URL, la clave y que no tenga símbolos sin codificar):', e.message);
    process.exit(1);
  }
  await D.query('BEGIN');
  try {
    // Sin esto las FK se validan en medio de la carga (el orden de tablas no importa).
    await D.query('SET LOCAL session_replication_role = replica');

    // 1) snapshot de lo que vino de v1
    const usrD = Object.fromEntries((await rows(D, 'select id,email from usuarios')).map((u) => [u.id, u.email]));
    const terD = Object.fromEntries((await rows(D, 'select id,razon_social,nit from terceros')).map((t) => [t.id, t]));
    const snapSol = (await rows(D, 'select to_jsonb(s) j from solicitudes s order by id')).map((r) => r.j);
    const ids = snapSol.map((s) => s.id);
    const snapHist = (await rows(D, 'select to_jsonb(h) j from historial_solicitudes h where solicitud_id=any($1) order by id', [ids])).map((r) => r.j);
    const snapCron = (await rows(D, 'select to_jsonb(c) j from cronograma_contratos c where solicitud_id=any($1) order by id', [ids])).map((r) => r.j);
    const cids = snapCron.map((c) => c.id);
    const snapFase = (await rows(D, 'select to_jsonb(f) j from fase_cronogramas f where cronograma_id=any($1) order by id', [cids])).map((r) => r.j);
    const snapAct = (await rows(D, 'select to_jsonb(a) j from actividad_cronogramas a where cronograma_id=any($1) order by id', [cids])).map((r) => r.j);
    const snapCont = await rows(D, "select tipo,anio,ultimo from contador_consecutivos where tipo not like 'DIRECTA-%'");
    console.log('snapshot v1:', snapSol.length, 'solicitudes,', snapHist.length, 'historial,', snapCron.length, 'cronogramas,', snapAct.length, 'actividades,', snapCont.length, 'contadores');
    if (snapSol.length === 0) throw new Error('El destino no tiene solicitudes de v1 que conservar; abortando por seguridad.');

    // 2) vaciar destino y copiar v2 completo
    const tablas = (await rows(V2, "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name<>'SequelizeMeta' order by 1")).map((r) => r.table_name);
    await D.query('TRUNCATE ' + tablas.map((t) => `"${t}"`).join(',') + ' RESTART IDENTITY');
    for (const t of tablas) {
      const j = (await rows(V2, `select coalesce(json_agg(x),'[]'::json) j from "${t}" x`))[0].j;
      if (j.length) await D.query(`insert into "${t}" select * from json_populate_recordset(null::"${t}", $1::json)`, [JSON.stringify(j)]);
    }
    console.log('v2 copiado:', tablas.length, 'tablas');

    // 3) fixtures de pruebas de v2
    const z = await rows(D, "select id from usuarios where email='ztest.visual@aed-test.local'");
    if (z.length) {
      await D.query('delete from notificaciones where usuario_id=$1', [z[0].id]);
      await D.query('delete from frente_usuarios where usuario_id=$1', [z[0].id]);
      await D.query('delete from usuarios where id=$1', [z[0].id]);
      console.log('usuario de prueba ztest eliminado');
    }
    await D.query("delete from contador_consecutivos where tipo like '%ZTEST%'");

    // 4) reemplazar solicitudes INDIRECTAS por las de v1
    const usrNew = Object.fromEntries((await rows(D, 'select id,email from usuarios')).map((u) => [u.email, u.id]));
    const terNew = await rows(D, 'select id,razon_social,nit from terceros');
    const mapU = (id) => {
      if (id == null) return null;
      const e = usrD[id];
      if (!usrNew[e]) throw new Error('usuario sin equivalente en v2: ' + e);
      return usrNew[e];
    };
    const mapT = (id) => {
      if (id == null) return null;
      const t = terD[id];
      const m = terNew.filter((x) => x.razon_social === t.razon_social && x.nit === t.nit);
      if (m.length !== 1) throw new Error('tercero sin equivalente único en v2: ' + t.razon_social + ' (' + m.length + ')');
      return m[0].id;
    };

    const ind = (await rows(D, "select id from solicitudes where categoria='INDIRECTA'")).map((r) => r.id);
    if (ind.length) {
      const cron = (await rows(D, 'select id from cronograma_contratos where solicitud_id=any($1)', [ind])).map((r) => r.id);
      const cc = await rows(D, 'select id from cuadros_comparativos where solicitud_id=any($1)', [ind]);
      const mem = await rows(D, 'select id from memorias where solicitud_id=any($1)', [ind]);
      if (cc.length || mem.length) throw new Error('las indirectas de v2 tienen cuadro/memoria; revisar antes de reemplazar');
      await D.query('delete from actividad_cronogramas where cronograma_id=any($1)', [cron]);
      await D.query('delete from fase_cronogramas where cronograma_id=any($1)', [cron]);
      await D.query('delete from cronograma_contratos where id=any($1)', [cron]);
      await D.query('delete from historial_solicitudes where solicitud_id=any($1)', [ind]);
      await D.query('delete from solicitudes where id=any($1)', [ind]);
      console.log('indirectas de v2 retiradas:', ind.join(','));
    }

    const ins = async (t, obj, { sinId = false } = {}) => {
      const o = { ...obj };
      if (sinId) delete o.id;
      const cols = Object.keys(o).map((c) => `"${c}"`).join(',');
      return (await rows(D, `insert into "${t}" (${cols}) select ${cols} from json_populate_record(null::"${t}", $1::json) returning id`, [JSON.stringify(o)]))[0].id;
    };

    for (const s of snapSol) {
      const o = { ...s };
      o.tercero_id = mapT(s.tercero_id);
      for (const k of Object.keys(o)) if (USER_COLS.test(k) && o[k] != null) o[k] = mapU(o[k]);
      await ins('solicitudes', o);
    }
    for (const h of snapHist) await ins('historial_solicitudes', { ...h, usuario_id: mapU(h.usuario_id) }, { sinId: true });
    const cmap = {};
    for (const c of snapCron) cmap[c.id] = await ins('cronograma_contratos', c, { sinId: true });
    const fmap = {};
    for (const f of snapFase) fmap[f.id] = await ins('fase_cronogramas', { ...f, cronograma_id: cmap[f.cronograma_id] }, { sinId: true });
    for (const a of snapAct) await ins('actividad_cronogramas', { ...a, cronograma_id: cmap[a.cronograma_id], fase_id: a.fase_id ? fmap[a.fase_id] : null }, { sinId: true });
    for (const c of snapCont) {
      // contador_consecutivos no tiene id: su clave es (tipo, anio).
      const ex = await rows(D, 'select ultimo from contador_consecutivos where tipo=$1 and anio=$2', [c.tipo, c.anio]);
      if (ex.length) await D.query('update contador_consecutivos set ultimo=greatest(ultimo,$1) where tipo=$2 and anio=$3', [c.ultimo, c.tipo, c.anio]);
      else await D.query('insert into contador_consecutivos (tipo,anio,ultimo) values ($1,$2,$3)', [c.tipo, c.anio, c.ultimo]);
    }
    console.log('solicitudes de v1 insertadas:', snapSol.length);

    // 5) secuencias de ids
    const conId = new Set((await rows(D, "select table_name from information_schema.columns where table_schema='public' and column_name='id'")).map((r) => r.table_name));
    for (const t of tablas.filter((x) => conId.has(x))) {
      const s = (await rows(D, `select pg_get_serial_sequence('"${t}"','id') s`))[0].s;
      if (s) {
        const m = (await rows(D, `select max(id) m from "${t}"`))[0].m;
        if (m != null) await D.query('select setval($1,$2,true)', [s, m]);
      }
    }

    await D.query('COMMIT');
    console.log('COMMIT ok');
  } catch (e) {
    await D.query('ROLLBACK');
    console.log('ROLLBACK (el destino quedó como estaba):', e.message);
    process.exitCode = 1;
  }
  await V2.end();
  await D.end();
})();
