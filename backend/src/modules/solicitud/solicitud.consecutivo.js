// Puerto literal de src/lib/utils.ts (abbreviate, normalizeFrenteName,
// buildConsecutivo) + src/lib/consecutivo.ts (resolveConsecutivoAbbrs) de la
// app Next.js original. Formato: SOL-{TIPO_ABREV}-{PROY_ABBR}-{FRENTE_NORMALIZED}-{NNN}.
const sequelize = require('../../config/db');
const Proyecto = require('../proyecto/proyecto.model');
const Frente = require('../frente/frente.model');

const TIPO_ABREV = {
  ORDEN_SERVICIO: 'ODS',
  CONTRATO: 'CONT',
  OTROSI_TIEMPO: 'OST',
  OTROSI_TIEMPO_CANTIDAD: 'OSTC',
  TRAMITE_CUENTA: 'TCC',
  TRAMITE_FACTURAS: 'TFC',
  TRAMITE_CUENTAS_RECURRENTES: 'TCR',
  TRAMITE_CUENTAS_OCASIONALES: 'TCO',
  TRAMITE_BONIFICACIONES_COMISIONES: 'TBC',
};

// Primeras `letterLength` letras mayúsculas de un nombre, sin acentos/espacios.
function abbreviate(name, letterLength) {
  const normalized = Array.from(name.normalize('NFD'))
    .filter((ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      return cp < 0x0300 || cp > 0x036f;
    })
    .join('')
    .toUpperCase();
  return normalized.replace(/[^A-Z]/g, '').slice(0, letterLength).padEnd(letterLength, 'X');
}

// Nombre completo del frente en mayúsculas, sin acentos/espacios/especiales
// (dígitos se conservan). Ej. "KALA 1" -> "KALA1".
function normalizeFrenteName(name) {
  return Array.from(name.normalize('NFD'))
    .filter((ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      return cp < 0x0300 || cp > 0x036f;
    })
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

// Las indirectas mantienen el formato de siempre (compatibilidad total con
// los consecutivos reales ya migrados); las directas llevan un segmento `D`
// extra para distinguirse a simple vista.
function buildConsecutivo(tipo, proyAbbr, frenAbbr, numero, categoria) {
  const abrev = TIPO_ABREV[tipo] ?? tipo;
  const num = String(numero).padStart(3, '0');
  const prefix = categoria === 'DIRECTA' ? 'SOL-D' : 'SOL';
  return `${prefix}-${abrev}-${proyAbbr}-${frenAbbr}-${num}`;
}

// Compartido por la creación normal, la de otrosí, y el import histórico --
// las tres necesitan exactamente la misma regla de abreviación.
async function resolveConsecutivoAbbrs(proyectoId, firstFrenteId) {
  const [proyecto, frente] = await Promise.all([
    Proyecto.findByPk(proyectoId, { attributes: ['nombre', 'codigo_consecutivo'] }),
    firstFrenteId ? Frente.findByPk(firstFrenteId, { attributes: ['nombre'] }) : Promise.resolve(null),
  ]);

  const proyAbbr = proyecto?.codigo_consecutivo?.trim() || abbreviate(proyecto?.nombre ?? String(proyectoId), 3);
  const frenAbbr = normalizeFrenteName(frente?.nombre ?? String(firstFrenteId ?? ''));

  return { proyAbbr, frenAbbr };
}

// Genera el consecutivo siguiente para (tipo, proyecto, frente) de forma
// transaccional -- SIEMPRE recibe la `transaction` ya abierta por el caller
// (nunca abre la suya propia). Un INSERT ... ON CONFLICT DO UPDATE atómico
// (no find-then-increment) es obligatorio acá: dos requests concurrentes
// creando una solicitud del mismo tipo/proyecto/frente no pueden terminar con
// el mismo consecutivo -- Postgres toma el lock de fila en el propio UPSERT,
// un find-then-increment separado tendría una carrera entre el find y el
// update.
async function generarConsecutivo(tipo, categoria, proyectoId, firstFrenteId, transaction) {
  const { proyAbbr, frenAbbr } = await resolveConsecutivoAbbrs(proyectoId, firstFrenteId);
  // La key de INDIRECTA se deja *bit a bit* igual a como estaba antes de que
  // existiera `categoria` -- cualquier cambio acá rompería la continuidad de
  // los contadores reales ya poblados por la Fase 9 (esta key es la PK de
  // contador_consecutivos). Las directas usan una key nueva, propia, que
  // arranca en 1 sin colisión posible con la indirecta del mismo tipo/frente.
  const key = categoria === 'DIRECTA' ? `DIRECTA-${tipo}-${proyAbbr}-${frenAbbr}` : `${tipo}-${proyAbbr}-${frenAbbr}`;

  const [rows] = await sequelize.query(
    `INSERT INTO contador_consecutivos (tipo, anio, ultimo) VALUES ($1, $2, 1)
     ON CONFLICT (tipo) DO UPDATE SET ultimo = contador_consecutivos.ultimo + 1
     RETURNING ultimo`,
    { bind: [key, new Date().getFullYear()], transaction }
  );

  return buildConsecutivo(tipo, proyAbbr, frenAbbr, rows[0].ultimo, categoria);
}

module.exports = { TIPO_ABREV, abbreviate, normalizeFrenteName, buildConsecutivo, resolveConsecutivoAbbrs, generarConsecutivo };
