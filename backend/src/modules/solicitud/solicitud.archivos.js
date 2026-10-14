// Ordena en Drive los archivos de una solicitud: los que subieron a
// <raiz>/_Pendientes los mueve a <raiz>/<Directas|Indirectas>/<consecutivo>/.
// Se llama despues de guardar la solicitud o su memoria. Es best-effort: un
// fallo de Drive nunca debe tumbar el guardado (el archivo queda en
// _Pendientes y el siguiente guardado lo reintenta).
const Solicitud = require('./solicitud.model');
const MemoriaFila = require('./memoriaFila.model');
const Memoria = require('./memoria.model');
const googleDrive = require('../../services/googleDrive');

const COLUMNAS_ARCHIVO = [
  'archivo_cuadro_comparativo',
  'archivo_cotizacion',
  'archivo_formato_solicitud',
  'archivo_pre_bep',
  'archivo_generador_gastos',
  'archivo_evaluacion_inicial',
];

const RE_DRIVE = /^\/files\/drive\/([\w-]+)$/;

function idsDriveEn(valores) {
  return valores.map((v) => (typeof v === 'string' ? RE_DRIVE.exec(v)?.[1] : null)).filter(Boolean);
}

async function organizarArchivos(solicitudId) {
  try {
    const solicitud = await Solicitud.findByPk(solicitudId);
    if (!solicitud?.consecutivo) return;

    const ids = idsDriveEn(COLUMNAS_ARCHIVO.map((c) => solicitud[c]));
    const memoria = await Memoria.findOne({ where: { solicitud_id: solicitud.id } });
    if (memoria) {
      const filas = await MemoriaFila.findAll({ where: { memoria_id: memoria.id } });
      for (const f of filas) ids.push(...idsDriveEn(Object.values(f.valores ?? {})));
    }
    if (ids.length === 0) return;

    const carpeta = await googleDrive.resolverCarpetaSolicitud(solicitud.categoria, solicitud.consecutivo);
    for (const id of new Set(ids)) await googleDrive.moverArchivo(id, carpeta);
  } catch (err) {
    console.error(`[archivos] no se pudieron ordenar los archivos de la solicitud ${solicitudId}:`, err.message);
  }
}

module.exports = { organizarArchivos };
