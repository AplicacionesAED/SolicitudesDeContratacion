// Limpieza de la tabla de la Memoria pegada desde Excel: del HTML del
// portapapeles deja una sola <table> con las etiquetas y estilos de formato
// permitidos (negritas, colores, bordes, celdas combinadas...). El backend
// vuelve a limpiarla al guardar (backend/src/utils/sanitizarTablaHtml.js, las
// listas de estilos permitidos deben coincidir).
const ALLOWED_PROPS = new Set([
  'font-weight', 'font-style', 'text-decoration', 'color', 'background', 'background-color',
  'text-align', 'vertical-align', 'white-space', 'font-size', 'width', 'height',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-width', 'border-style', 'border-color',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
]);
const OWN_PROPS = new Set(['padding', 'line-height', 'max-width']);
const EL = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'colgroup', 'col', 'caption']);
const STRUCT = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'colgroup']);
const INLINE = { b: 'b', strong: 'b', i: 'i', em: 'i', u: 'u', s: 's', strike: 's', del: 's', sup: 'sup', sub: 'sub', span: 'span', br: 'br' };
const DROP = new Set(['script', 'style', 'meta', 'link', 'title', 'head', 'xml', 'object', 'embed', 'iframe', 'svg', 'img', 'input', 'textarea', 'select', 'button', 'noscript', 'template', 'form', 'audio', 'video', 'canvas']);
export const MAX_CELDAS = 10000;

// Excel usa colores del sistema (windowtext = "automático"); en modo oscuro el navegador los pinta claros, se fijan.
const SYS_COLORS = [
  [/\b(windowtext|buttontext|captiontext|menutext|infotext)\b/gi, '#000000'],
  [/\b(window|buttonface|menu|infobackground|field)\b/gi, '#ffffff'],
  [/\bgraytext\b/gi, '#808080'],
];

function safeValue(v) {
  let s = String(v).replace(/!important/gi, '').trim();
  SYS_COLORS.forEach(([re, to]) => { s = s.replace(re, to); });
  if (!s || s.length > 120) return null;
  if (!/^[#\w\s.,%()\-+'"/]*$/.test(s)) return null;
  if (/url\s*\(|expression|javascript|import|var\s*\(/i.test(s)) return null;
  return s;
}

function declsToMap(text) {
  const m = new Map();
  String(text || '').split(';').forEach((d) => {
    const i = d.indexOf(':');
    if (i < 1) return;
    const p = d.slice(0, i).trim().toLowerCase();
    const v = d.slice(i + 1).trim();
    if (p && v) m.set(p, v);
  });
  return m;
}

function specOf(sel) {
  const ids = (sel.match(/#[\w-]+/g) || []).length;
  const cls = (sel.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g) || []).length;
  const els = (sel.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length;
  return ids * 100 + cls * 10 + els;
}

// Excel pone el formato en un bloque <style> con clases (.xl65, .xl66...). Se resuelven y quedan como estilo de cada celda.
function parseRules(doc) {
  let css = '';
  doc.querySelectorAll('style').forEach((s) => { css += `${s.textContent}\n`; });
  css = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--|-->/g, '').replace(/@[^{;]+\{[^{}]*\}/g, '');
  const rules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  let idx = 0;
  while ((m = re.exec(css))) {
    const decls = declsToMap(m[2]);
    m[1].split(',').forEach((sel) => {
      const s = sel.trim();
      if (s) rules.push({ sel: s, decls, spec: specOf(s), idx: idx++ });
    });
  }
  rules.sort((a, b) => a.spec - b.spec || a.idx - b.idx);
  return rules;
}

function stylesFor(n, rules) {
  const out = new Map();
  rules.forEach((r) => {
    let hit = false;
    try { hit = n.matches(r.sel); } catch { hit = false; }
    if (hit) r.decls.forEach((v, k) => out.set(k, v));
  });
  const bg = n.getAttribute('bgcolor');
  if (bg && !out.has('background-color')) out.set('background-color', bg);
  const al = n.getAttribute('align');
  if (al && !out.has('text-align')) out.set('text-align', al);
  const va = n.getAttribute('valign');
  if (va && !out.has('vertical-align')) out.set('vertical-align', va);
  const tg = n.tagName.toLowerCase();
  if (tg === 'col' || tg === 'td' || tg === 'th') {
    const w = n.getAttribute('width');
    if (w && /^\d+(\.\d+)?$/.test(w.trim()) && !out.has('width')) out.set('width', `${w.trim()}px`);
  }
  declsToMap(n.getAttribute('style')).forEach((v, k) => out.set(k, v));
  return out;
}

// Tamaño compacto: la letra grande se acerca al cuerpo. Nada baja de 10,5 px ni pasa de 15 px.
function compactSize(v) {
  const m = /^([\d.]+)\s*(pt|px)$/i.exec(String(v).trim());
  if (!m) return null;
  const px = parseFloat(m[1]) * (m[2].toLowerCase() === 'pt' ? 96 / 72 : 1);
  if (!(px > 0)) return null;
  const c = 12 + (px - 14.67) * 0.2;
  return Math.round(Math.min(15, Math.max(10.5, c)) * 10) / 10;
}

function applyStyle(src, el, ctx, force) {
  const tag = el.tagName.toLowerCase();
  const parts = [];
  if (force) parts.push(force);
  stylesFor(src, ctx.rules).forEach((v, k) => {
    if (!(ALLOWED_PROPS.has(k) || (ctx.own && OWN_PROPS.has(k)))) return;
    if (ctx.compact) {
      if (k === 'width' || k === 'height' || k === 'white-space') return;
      if (k === 'font-size') {
        const px = compactSize(v);
        if (px) parts.push(`font-size:${px}px`);
        return;
      }
    }
    const s = safeValue(v);
    if (s) parts.push(`${k}:${s}`);
  });
  if (ctx.compact && (tag === 'td' || tag === 'th')) parts.push('padding:1px 4px');
  if (parts.length) el.setAttribute('style', parts.join(';'));
}

function finishCell(el) {
  while (el.lastChild && el.lastChild.nodeName === 'BR') el.removeChild(el.lastChild);
  const f = el.firstChild;
  if (f && f.nodeType === 3) {
    f.nodeValue = f.nodeValue.replace(/^\s+/, '');
    if (!f.nodeValue) el.removeChild(f);
  }
  const l = el.lastChild;
  if (l && l.nodeType === 3) {
    l.nodeValue = l.nodeValue.replace(/\s+$/, '');
    if (!l.nodeValue) el.removeChild(l);
  }
  if (!el.firstChild) el.appendChild(el.ownerDocument.createTextNode(' '));
}

function cleanChildren(src, out, ctx) {
  Array.from(src.childNodes).forEach((n) => cleanNode(n, out, ctx));
}

function cleanNode(n, out, ctx) {
  if (n.nodeType === 3) {
    if (STRUCT.has(out.nodeName.toLowerCase())) return;
    const t = n.nodeValue.replace(/[\s ]+/g, ' ');
    if (t) out.appendChild(ctx.doc.createTextNode(t));
    return;
  }
  if (n.nodeType !== 1) return;
  const tag = n.tagName.toLowerCase();
  if (DROP.has(tag)) return;
  if (EL.has(tag)) {
    if (ctx.compact && (tag === 'colgroup' || tag === 'col')) return;
    const el = ctx.doc.createElement(tag);
    if (tag === 'td' || tag === 'th') {
      const cs = parseInt(n.getAttribute('colspan'), 10);
      const rs = parseInt(n.getAttribute('rowspan'), 10);
      if (cs > 1 && cs <= 1000) el.setAttribute('colspan', String(cs));
      if (rs > 1 && rs <= 1000) el.setAttribute('rowspan', String(rs));
    }
    if (tag === 'col') {
      const sp = parseInt(n.getAttribute('span'), 10);
      if (sp > 1 && sp <= 1000) el.setAttribute('span', String(sp));
    }
    applyStyle(n, el, ctx, tag === 'table' ? (ctx.compact ? 'border-collapse:collapse;line-height:1.25' : 'border-collapse:collapse') : '');
    cleanChildren(n, el, ctx);
    if (tag === 'td' || tag === 'th') {
      finishCell(el);
      if (ctx.compact && el.textContent.length > 40) {
        const st = el.getAttribute('style');
        el.setAttribute('style', `${st ? `${st};` : ''}max-width:260px`);
      }
    }
    out.appendChild(el);
    return;
  }
  if (INLINE[tag]) {
    const t = INLINE[tag];
    if (t === 'br') {
      out.appendChild(ctx.doc.createElement('br'));
      return;
    }
    const el = ctx.doc.createElement(t);
    if (t === 'span') applyStyle(n, el, ctx, '');
    cleanChildren(n, el, ctx);
    out.appendChild(el);
    return;
  }
  if (tag === 'p' || tag === 'div' || tag === 'li') {
    cleanChildren(n, out, ctx);
    if (n.nextSibling && !STRUCT.has(out.nodeName.toLowerCase())) out.appendChild(ctx.doc.createElement('br'));
    return;
  }
  cleanChildren(n, out, ctx);
}

function measure(table) {
  const rows = table.rows.length;
  let cols = 0;
  Array.from(table.rows).forEach((r) => {
    let c = 0;
    Array.from(r.cells).forEach((x) => { c += parseInt(x.getAttribute('colspan'), 10) || 1; });
    if (c > cols) cols = c;
  });
  return { rows, cols, cells: table.querySelectorAll('td,th').length };
}

function isBlankRow(tr) {
  return Array.from(tr.cells).every((c) => !c.textContent.replace(/[\s ]/g, '') && !/background|border/.test(c.getAttribute('style') || ''));
}

// Quita filas vacías al inicio y al final, y deja una sola fila delgada donde había varias seguidas.
function compactRows(table) {
  const trs = Array.from(table.rows);
  // Una fila solo se toca si ninguna celda combinada (rowspan) la cruza ni empieza en ella.
  const covered = new Set();
  trs.forEach((tr, i) => Array.from(tr.cells).forEach((c) => {
    const rs = parseInt(c.getAttribute('rowspan'), 10) || 1;
    for (let k = 1; k < rs; k++) covered.add(i + k);
  }));
  const blank = trs.map((tr, i) => !covered.has(i) && !Array.from(tr.cells).some((c) => c.hasAttribute('rowspan')) && isBlankRow(tr));
  let a = 0;
  let b = trs.length;
  while (a < b && blank[a]) { trs[a].remove(); a++; }
  while (b > a && blank[b - 1]) { trs[b - 1].remove(); b--; }
  let prev = false;
  for (let i = a; i < b; i++) {
    if (blank[i]) {
      if (prev) trs[i].remove();
      else Array.from(trs[i].cells).forEach((c) => c.setAttribute('style', 'padding:0;font-size:4px;line-height:4px'));
    }
    prev = blank[i];
  }
}

function buildTable(html, compact, own) {
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  const src = doc.querySelector('table');
  if (!src) return null;
  if (src.querySelectorAll('td,th').length > MAX_CELDAS) return { tooBig: true };
  const ctx = { doc, rules: parseRules(doc), compact: !!compact, own: !!own };
  const holder = doc.createElement('div');
  cleanNode(src, holder, ctx);
  const table = holder.firstChild;
  if (!table) return null;
  if (compact) compactRows(table);
  return { html: table.outerHTML, ...measure(table) };
}

const byteLen = (s) => new TextEncoder().encode(s).length;

// HTML pegado -> `{ html, rows, cols, cells, bytes }` de una sola tabla limpia, `{ tooBig }` o null si no hay tabla.
// opts.compact: letra y espacios más chicos. opts.own: tabla que ya salió de aquí (conserva su relleno).
export function sanitizarTabla(html, opts) {
  const o = opts || {};
  const res = buildTable(html, o.compact, o.own);
  if (!res || res.tooBig) return res;
  res.bytes = byteLen(res.html);
  return res;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseDelimited(text, delim) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"' && cell === '') q = true;
    else if (c === delim) { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

// Plan B: si el portapapeles solo trae texto separado por tabulaciones, se arma una tabla simple con bordes.
export function textoATabla(text, opts) {
  const t = String(text);
  const delim = t.includes('\t') ? '\t' : (t.includes(';') ? ';' : '\t');
  const rows = parseDelimited(t, delim);
  if (!rows.length) return null;
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  if (rows.length * w > MAX_CELDAS) return { tooBig: true };
  const cs = 'border:1px solid #9AA4AD';
  const body = rows.map((r) => {
    let tds = '';
    for (let i = 0; i < w; i++) tds += `<td style="${cs}">${esc(String(r[i] == null ? '' : r[i]).replace(/\s*[\r\n]+\s*/g, ' ').trim()) || '&nbsp;'}</td>`;
    return `<tr>${tds}</tr>`;
  }).join('');
  return sanitizarTabla(`<table><tbody>${body}</tbody></table>`, opts);
}

// Lo pegado (HTML + texto plano del portapapeles) -> tabla limpia, o null si no se encontró ninguna.
export function tablaDesdePortapapeles(html, text, opts) {
  let res = null;
  if (/<table[\s>]/i.test(html || '')) res = sanitizarTabla(html, opts);
  if (!res && /[\t\r\n]/.test(String(text || '').trim())) res = textoATabla(text, opts);
  return res;
}
