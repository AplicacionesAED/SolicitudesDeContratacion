// Pasa a Google Drive los archivos que hoy viven en disco (UPLOADS_DIR, URLs
// "/files/<nombre>") y reescribe la URL en la base a "/files/drive/<fileId>".
// Por defecto es SIMULACRO (no sube ni escribe nada): agregar --aplicar.
// Idempotente: una URL que ya es "/files/drive/..." se ignora; si el archivo
// local no existe se informa y se deja la URL como estaba.
//
//   node scripts/migrarArchivosADrive.js            (simulacro)
//   node scripts/migrarArchivosADrive.js --aplicar
require('dotenv').config();
const path = require('path');
const { readFile } = require('fs/promises');
const { QueryTypes } = require('sequelize');
const sequelize = require('../src/config/db');
const googleDrive = require('../src/services/googleDrive');
const { UPLOADS_DIR, CONTENT_TYPES } = require('../src/modules/upload/upload.config');

const APLICAR = process.argv.includes('--aplicar');

const COLUMNAS = [
  'archivo_cuadro_comparativo',
  'archivo_cotizacion',
  'archivo_formato_solicitud',
  'archivo_pre_bep',
  'archivo_generador_gastos',
  'archivo_evaluacion_inicial',
];

const cache = new Map(); // "/files/x" -> "/files/drive/id"

async function subir(urlVieja) {
  if (cache.has(urlVieja)) return cache.get(urlVieja);
  const filename = urlVieja.replace(/^\/files\//, '');
  let buffer;
  try {
    buffer = await readFile(path.join(UPLOADS_DIR, filename));
  } catch {
    console.log(`  ! no existe en disco: ${filename} (se deja la URL tal cual)`);
    cache.set(urlVieja, null);
    return null;
  }
  const ext = path.extname(filename).toLowerCase();
  if (!APLICAR) {
    console.log(`  - subiría ${filename} (${buffer.length} bytes)`);
    cache.set(urlVieja, null);
    return null;
  }
  const carpeta = await googleDrive.resolverCarpetaSolicitudes();
  const subido = await googleDrive.subirArchivo(buffer, filename, CONTENT_TYPES[ext] ?? 'application/octet-stream', carpeta);
  const urlNueva = `/files/drive/${subido.id}`;
  console.log(`  + ${filename} -> ${urlNueva}`);
  cache.set(urlVieja, urlNueva);
  return urlNueva;
}

const esLocal = (v) => typeof v === 'string' && /^\/files\/(?!drive\/)[^/]+$/.test(v);

async function main() {
  console.log(APLICAR ? 'MODO APLICAR' : 'SIMULACRO (usa --aplicar para subir y escribir)');

  for (const col of COLUMNAS) {
    const filas = await sequelize.query(`SELECT id, ${col} AS url FROM solicitudes WHERE ${col} LIKE '/files/%' AND ${col} NOT LIKE '/files/drive/%'`, { type: QueryTypes.SELECT });
    for (const f of filas) {
      console.log(`solicitud ${f.id} ${col}`);
      const nueva = await subir(f.url);
      if (nueva) await sequelize.query(`UPDATE solicitudes SET ${col} = $1 WHERE id = $2`, { bind: [nueva, f.id] });
    }
  }

  // Imágenes de la Memoria: la URL vive dentro del JSONB `valores` de cada fila.
  const filasMemoria = await sequelize.query('SELECT id, valores FROM memoria_filas', { type: QueryTypes.SELECT });
  for (const f of filasMemoria) {
    let cambio = false;
    const valores = { ...(f.valores ?? {}) };
    for (const [k, v] of Object.entries(valores)) {
      if (!esLocal(v)) continue;
      console.log(`memoria_fila ${f.id} columna ${k}`);
      const nueva = await subir(v);
      if (nueva) {
        valores[k] = nueva;
        cambio = true;
      }
    }
    if (cambio) await sequelize.query('UPDATE memoria_filas SET valores = $1::jsonb WHERE id = $2', { bind: [JSON.stringify(valores), f.id] });
  }

  console.log('Listo.');
  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  await sequelize.close().catch(() => {});
  process.exit(1);
});
