// Limpia el HTML de la tabla de la Memoria (pegada desde Excel) antes de
// guardarla y de enviarla al navegador: solo una <table> con las etiquetas,
// atributos y estilos de formato de celda que el frontend sabe producir
// (frontend/src/utils/memoriaTabla.js). Cualquier otra cosa se descarta.
const sanitizeHtml = require('sanitize-html');

const MAX_BYTES = 2 * 1024 * 1024;

// Misma regla que `safeValue` del frontend: sin url(), expression, var(), etc.
const VALOR_SEGURO = /^(?!.*(url\s*\(|expression|javascript|import|var\s*\())[#\w\s.,%()\-+'"/]{1,120}$/i;
const PROPS_ESTILO = [
  'font-weight', 'font-style', 'text-decoration', 'color', 'background', 'background-color',
  'text-align', 'vertical-align', 'white-space', 'font-size', 'width', 'height', 'max-width',
  'padding', 'line-height', 'border-collapse',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-width', 'border-style', 'border-color',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
];
const allowedStyles = { '*': Object.fromEntries(PROPS_ESTILO.map((p) => [p, [VALOR_SEGURO]])) };

const OPCIONES = {
  allowedTags: ['table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'colgroup', 'col', 'caption', 'b', 'i', 'u', 's', 'sup', 'sub', 'span', 'br'],
  allowedAttributes: {
    table: ['style'],
    td: ['style', 'colspan', 'rowspan'],
    th: ['style', 'colspan', 'rowspan'],
    col: ['style', 'span'],
    span: ['style'],
  },
  allowedStyles,
  disallowedTagsMode: 'discard',
};

// Devuelve el HTML limpio, o '' si no queda ninguna tabla. Lanza si pesa demasiado.
function sanitizarTablaHtml(html) {
  if (typeof html !== 'string' || !html.trim()) return '';
  if (Buffer.byteLength(html) > MAX_BYTES) throw new Error('La tabla de la memoria es demasiado grande');
  const limpio = sanitizeHtml(html, OPCIONES);
  return /<table[\s>]/i.test(limpio) ? limpio : '';
}

module.exports = { sanitizarTablaHtml };
