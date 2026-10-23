// Memoria como tabla pegada desde Excel: la persona arma la tabla en Excel,
// la copia y la pega acá; queda con su formato (celdas combinadas, colores,
// bordes...) y se guarda como un solo campo de texto con el HTML ya limpio.
// Componente controlado `{value, onChange}` (value = HTML de la tabla o '');
// el padre persiste vía guardarMemoria. Las celdas se pueden corregir con un
// clic. La limpieza vive en utils/memoriaTabla.js (el backend la repite).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { sanitizarTabla, tablaDesdePortapapeles, MAX_CELDAS } from '../../utils/memoriaTabla.js';
import styles from './Solicitudes.module.css';

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
}

// Hoja → HTML de la tabla sin los atributos de edición.
function htmlDeHoja(hoja) {
  const t = hoja.querySelector('table');
  if (!t) return '';
  const c = t.cloneNode(true);
  c.querySelectorAll('[contenteditable],[spellcheck]').forEach((x) => {
    x.removeAttribute('contenteditable');
    x.removeAttribute('spellcheck');
  });
  return c.outerHTML;
}

export function MemoriaTablaEditor({ value = '', onChange, avisoFormatoAnterior = false }) {
  const [compact, setCompact] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [grid, setGrid] = useState(false);
  const hojaRef = useRef(null);
  // Lo último que este componente emitió: evita reescribir la hoja (y perder el cursor) cuando el padre nos devuelve lo mismo.
  const emitido = useRef(null);
  const origen = useRef(null); // { html, text } del último pegado, para recompactar
  const editado = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    const hoja = hojaRef.current;
    if (!hoja || value === emitido.current) return;
    hoja.innerHTML = value || '';
    hoja.querySelectorAll('td,th').forEach((c) => {
      c.contentEditable = 'true';
      c.spellcheck = false;
    });
    emitido.current = value;
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const info = useMemo(() => (value ? sanitizarTabla(value, { own: true }) : null), [value]);

  function emitir(html) {
    emitido.current = null; // fuerza a repintar la hoja con el HTML nuevo
    onChange(html);
  }

  function ingerir(html, text) {
    const res = tablaDesdePortapapeles(html, text, { compact });
    if (!res) return setAviso('No encontré una tabla en lo que pegaste.');
    if (res.tooBig) return setAviso(`La tabla es demasiado grande (más de ${MAX_CELDAS.toLocaleString('es-CO')} celdas).`);
    origen.current = { html, text };
    editado.current = false;
    setAviso(null);
    emitir(res.html);
  }

  function onPaste(e) {
    const cd = e.clipboardData;
    if (!cd) return;
    const html = cd.getData('text/html') || '';
    const text = cd.getData('text/plain') || '';
    const enCelda = !!e.target.closest?.('[data-hoja]');
    if (enCelda) {
      // Dentro de una celda se pega texto normal; solo se reemplaza la tabla si lo copiado tiene más de una celda.
      const res = /<table[\s>]/i.test(html) ? sanitizarTabla(html) : null;
      e.preventDefault();
      if (!res || res.tooBig || res.cells <= 1) {
        document.execCommand('insertText', false, text.replace(/\s*[\r\n]+\s*/g, ' ').replace(/\t/g, ' ').trim());
      } else ingerir(html, text);
      return;
    }
    e.preventDefault();
    ingerir(html, text);
  }

  function onInput() {
    editado.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const hoja = hojaRef.current;
      const html = hoja ? htmlDeHoja(hoja) : '';
      if (!html) return;
      const res = sanitizarTabla(html, { own: true });
      if (res && !res.tooBig) {
        emitido.current = res.html;
        onChange(res.html);
      }
    }, 150);
  }

  function cambiarCompacto(e) {
    const nuevo = e.target.checked;
    setCompact(nuevo);
    if (!value) return;
    if (editado.current || !origen.current) {
      setAviso('Ya editaste la tabla. El cambio se aplicará a la próxima que pegues.');
      return;
    }
    const res = tablaDesdePortapapeles(origen.current.html, origen.current.text, { compact: nuevo });
    if (res && !res.tooBig) emitir(res.html);
  }

  function quitar() {
    origen.current = null;
    editado.current = false;
    setAviso(null);
    emitir('');
  }

  function copiarTabla() {
    const t = hojaRef.current?.querySelector('table');
    if (!t) return setAviso('No hay tabla para copiar.');
    const sel = window.getSelection();
    const rg = document.createRange();
    rg.selectNode(t);
    sel.removeAllRanges();
    sel.addRange(rg);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* sin portapapeles */ }
    sel.removeAllRanges();
    setAviso(ok ? 'Tabla copiada con su formato. Pégala en Excel o en Word.' : 'No se pudo copiar. Selecciona la tabla y cópiala manualmente.');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }} onPaste={onPaste}>
      {avisoFormatoAnterior && (
        <p className={styles.infoBanner}>
          Esta solicitud tiene una memoria en el formato anterior. Si pegas una tabla aquí, la reemplaza al guardar.
        </p>
      )}
      <p style={{ margin: 0, color: 'var(--color-ink-muted)', fontSize: 'var(--text-data-size)' }}>
        Arma la tabla en Excel, cópiala (Ctrl+C) y pégala aquí (Ctrl+V). Queda con su formato: celdas combinadas, negritas, colores y bordes. Se guarda el valor que se ve en la celda, no la fórmula; no se incluyen imágenes ni gráficos. Si pegas de nuevo, la tabla se reemplaza.
      </p>
      <textarea
        className={styles.memoriaPegar}
        rows={2}
        spellCheck={false}
        value=""
        readOnly
        aria-label="Pegar tabla desde Excel"
        placeholder="Haz clic aquí y pega la tabla de Excel (Ctrl+V). También funciona pegar en cualquier parte de este recuadro."
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-md)' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-data-size)' }}>
          <input type="checkbox" checked={compact} onChange={cambiarCompacto} />
          Compactar formato
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-data-size)' }}>
          <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} />
          Ver cuadrícula
        </label>
        {info && (
          <span style={{ color: info.bytes > 200 * 1024 ? 'var(--color-danger-ink)' : 'var(--color-ink-muted)', fontSize: 'var(--text-data-size)' }}>
            {info.rows} {info.rows === 1 ? 'fila' : 'filas'} × {info.cols} {info.cols === 1 ? 'columna' : 'columnas'} · {kb(info.bytes)}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <Button type="button" variant="secondary" onClick={copiarTabla} disabled={!value}>Copiar tabla</Button>
        <Button type="button" variant="danger" onClick={quitar} disabled={!value}>Quitar tabla</Button>
      </div>
      {aviso && <p style={{ margin: 0, color: 'var(--color-ink-muted)', fontSize: 'var(--text-data-size)' }} role="status">{aviso}</p>}
      <div className={`${styles.memoriaHojaBox} ${grid ? styles.memoriaGrid : ''}`}>
        <div
          ref={hojaRef}
          data-hoja
          className={styles.memoriaHoja}
          onInput={onInput}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.target.closest?.('td,th')) e.preventDefault(); }}
        />
        {!value && <p className={styles.memoriaVacia}>Todavía no hay tabla. Pega un rango de Excel en el recuadro de arriba.</p>}
      </div>
    </div>
  );
}

// Vista de solo lectura (detalle de la solicitud). El HTML ya viene limpio del backend.
export function MemoriaTablaVista({ html }) {
  return (
    <div className={styles.memoriaHojaBox}>
      <div className={styles.memoriaHoja} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
