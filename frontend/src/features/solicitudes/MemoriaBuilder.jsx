// Módulo "Memoria" (nuevo, sin equivalente en la app Next.js original) --
// pedido del negocio: una tabla tipo Excel donde el usuario define su
// PROPIA estructura -- agrega columnas eligiendo el tipo (Texto/Entero/
// Float/Fecha/Rango de fechas/Calculada) y filas libremente, con la primera
// columna siempre reservada para anexar una imagen. Solo aplica a
// Solicitudes Directas por ahora (gateado en SolicitudForm.jsx por
// `categoriaEfectiva`, este componente no lo restringe).
//
// Mismo contrato de componente controlado que CuadroComparativoBuilder.jsx
// (`{value, onChange}`, sin fetch/save propio -- el padre persiste vía
// guardarMemoria) y mismo patrón `clientId` para referenciar columnas entre
// sí (fórmulas) y filas/columnas antes de tener ids reales -- ver el
// comentario grande en backend/src/modules/solicitud/memoria.js.
//
// Columnas CALCULADA: el valor NUNCA se guarda, se calcula acá en cada
// render a partir de sus 2 columnas operando (mismo criterio que los
// totales de Cuadro Comparativo) -- sus operandos solo pueden ser columnas
// ENTERO/FLOAT (nunca otra CALCULADA), decisión explícita para no tener que
// detectar ciclos.
import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, GripVertical, Settings } from 'lucide-react';
import { API_BASE_URL } from '../../api/client.js';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import { FileField } from '../../components/ui/FileField.jsx';
import { CeldaTextoLargo } from './CuadroComparativoBuilder.jsx';
import styles from './Solicitudes.module.css';

function nuevoClientId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// La primera columna SIEMPRE es esta -- fija, no se puede quitar ni cambiar
// de tipo (pedido explícito: "que la primera columna sea para anexar
// imágenes"). `clientId` fijo (no random) para que sobreviva sin cambiar
// entre renders/guardados de una memoria recién creada.
function columnaImagenFija() {
  return { clientId: 'imagen', nombre: 'Imagen', tipo: 'IMAGEN' };
}

function emptyColumna() {
  return { clientId: nuevoClientId(), nombre: '', tipo: 'TEXTO', mostrarTotal: false };
}

function emptyFila() {
  return { clientId: nuevoClientId(), valores: {} };
}

export function memoriaVacia() {
  return { titulo: '', columnas: [columnaImagenFija()], filas: [] };
}

// Normaliza lo que llega del backend (columnas/filas con `id` real, sin
// `clientId`) -- mismo patrón que normalizarCuadroComparativo. Como
// `clientId = String(id)` y las keys de `fila.valores` YA vienen como
// string del id real (así serializa Postgres/JS un JSONB), no hace falta
// remapear `valores` -- ya calzan solas con el `clientId` recién asignado.
export function normalizarMemoria(memoria) {
  if (!memoria) return memoriaVacia();
  const columnas = (memoria.columnas ?? []).map((c) => ({
    ...c,
    clientId: String(c.id),
    formulaColumnaAClientId: c.formulaColumnaAId != null ? String(c.formulaColumnaAId) : undefined,
    formulaColumnaBClientId: c.formulaColumnaBId != null ? String(c.formulaColumnaBId) : undefined,
  }));
  const filas = (memoria.filas ?? []).map((f) => ({ clientId: String(f.id), valores: { ...(f.valores ?? {}) } }));
  return { titulo: memoria.titulo ?? '', columnas: columnas.length > 0 ? columnas : [columnaImagenFija()], filas };
}

const TIPOS_COLUMNA = [
  ['TEXTO', 'Texto'],
  ['ENTERO', 'Entero'],
  ['FLOAT', 'Float'],
  ['FECHA', 'Fecha'],
  ['RANGO_FECHAS', 'Rango de fechas'],
  ['CALCULADA', 'Calculada'],
];

const OPERADORES = [['+', '+'], ['-', '−'], ['*', '×'], ['/', '÷']];
const TIPOS_CON_TOTAL = ['ENTERO', 'FLOAT', 'CALCULADA'];
const TIPOS_OPERANDO_FORMULA = ['ENTERO', 'FLOAT'];

// 2026-10-20: el borde/fondo ya NO van acá -- pasaron a `styles.celdaInput`
// (Solicitudes.module.css), que sí puede tener `:hover`/`:focus` (un `style`
// inline no puede). Las dos funciones se quedan solo con el resto del box
// model puntual de cada control.
function inputCellStyle(extra) {
  return { width: '100%', font: 'inherit', ...extra };
}

// El encabezado (`<th>`) hereda `text-transform:uppercase`/`letter-spacing`
// de `.table th` (Solicitudes.module.css) -- se resetea acá para que lo que
// el usuario escribe/elige no se vea deformado mientras edita (el nombre
// SÍ se sigue mostrando en mayúsculas visualmente, es solo el control de
// edición el que necesita texto normal para no confundir).
function headerControlStyle(extra) {
  return { width: '100%', font: 'inherit', textTransform: 'none', letterSpacing: 'normal', fontWeight: 600, ...extra };
}

// Única fuente de verdad para el valor de una columna CALCULADA y para la
// suma de una columna en la fila TOTAL -- usada acá mismo (edición) Y en
// SolicitudDetallePage.jsx (solo lectura), para que las dos vistas nunca
// puedan mostrar un número distinto para lo mismo.
export function calcularValorCalculada(valoresFila, columna) {
  if (columna.tipo !== 'CALCULADA') return valoresFila?.[columna.clientId];
  const a = Number(valoresFila?.[columna.formulaColumnaAClientId]) || 0;
  const b = Number(valoresFila?.[columna.formulaColumnaBClientId]) || 0;
  switch (columna.formulaOperador) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 0;
    default: return 0;
  }
}

export function calcularTotalColumna(filas, columna) {
  return filas.reduce((acc, f) => acc + (Number(calcularValorCalculada(f.valores, columna)) || 0), 0);
}

// `GET /files/:filename` es autenticado (requireAuth) -- un <img src>
// directo a otro origen (dev: frontend :5193 vs backend :3021) NO manda la
// cookie de sesión (SameSite=Lax no viaja en un subrecurso cross-site como
// un <img>, a diferencia de una navegación de nivel superior) -- mismo
// problema que ya resuelve api/solicitudes.js#descargarArchivo para las
// descargas. Acá se resuelve igual pero para mostrar una MINIATURA en vez
// de guardar un archivo: fetch autenticado -> blob -> object URL, con
// revoke al desmontar/cambiar para no filtrar memoria. Funciona igual en
// dev (cross-origin) y en producción (mismo contenedor, incluso si ahí sí
// hubiera funcionado un <img src> directo).
export function ImagenAutenticada({ url, alt }) {
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      return;
    }
    let cancelado = false;
    let objectUrl = null;
    const urlCompleta = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    fetch(urlCompleta, { credentials: 'include' })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error('No se pudo cargar la imagen'))))
      .then((blob) => {
        if (cancelado) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelado) setBlobUrl(null);
      });
    return () => {
      cancelado = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!url) return null;
  if (!blobUrl) return <span style={{ fontSize: 'var(--text-label-size)', color: 'var(--color-ink-muted)' }}>Cargando imagen…</span>;
  return <img src={blobUrl} alt={alt ?? ''} style={{ maxWidth: 140, maxHeight: 120, display: 'block', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />;
}

function CeldaMemoria({ columna, valor, valoresFila, onChange, soloLectura }) {
  if (columna.tipo === 'IMAGEN') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 130 }}>
        {valor && <ImagenAutenticada url={valor} alt={columna.nombre} />}
        {!soloLectura && <FileField accept="image/*" value={valor ?? ''} onChange={onChange} />}
      </div>
    );
  }
  if (soloLectura) {
    if (columna.tipo === 'RANGO_FECHAS') {
      const rango = valor ?? {};
      return <span>{rango.inicio || '—'} – {rango.fin || '—'}</span>;
    }
    if (columna.tipo === 'CALCULADA') return <span>{calcularValorCalculada(valoresFila, columna)}</span>;
    return <span>{valor ?? '—'}</span>;
  }
  switch (columna.tipo) {
    case 'FECHA':
      return <input type="date" className={styles.celdaInput} value={valor ?? ''} onChange={(e) => onChange(e.target.value)} style={inputCellStyle()} />;
    case 'RANGO_FECHAS': {
      const rango = valor ?? {};
      return (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', whiteSpace: 'nowrap' }}>
          <input type="date" className={styles.celdaInput} value={rango.inicio ?? ''} onChange={(e) => onChange({ ...rango, inicio: e.target.value })} style={inputCellStyle()} />
          <span>–</span>
          <input type="date" className={styles.celdaInput} value={rango.fin ?? ''} onChange={(e) => onChange({ ...rango, fin: e.target.value })} style={inputCellStyle()} />
        </div>
      );
    }
    case 'ENTERO':
      return <input type="number" step="1" className={styles.celdaInput} value={valor ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} style={inputCellStyle()} />;
    case 'FLOAT':
      return <input type="number" step="any" className={styles.celdaInput} value={valor ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} style={inputCellStyle()} />;
    case 'CALCULADA':
      return <span style={{ color: 'var(--color-ink-muted)' }}>{calcularValorCalculada(valoresFila, columna)}</span>;
    case 'TEXTO':
    default:
      return <CeldaTextoLargo value={valor} onChange={(e) => onChange(e.target.value)} />;
  }
}

function labelTipoColumna(tipo) {
  return TIPOS_COLUMNA.find(([v]) => v === tipo)?.[1] ?? tipo;
}

// Encabezado editable de una columna -- pedido explícito del usuario: "que
// se pueda modificar el texto de los encabezados... y el tipo", sin una
// sección de "Columnas" aparte por fuera de la tabla. El nombre se edita
// inline en el propio `<th>`; el resto (tipo, fórmula/mostrar total si es
// Calculada) vive en un panel flotante detrás de un ícono de engranaje --
// pedido de seguimiento del usuario tras ver que un encabezado Calculada
// (nombre + tipo + 3 selects de fórmula + checkbox, todo apilado) hacía la
// fila de encabezados enorme y amontonada. Mismo patrón de panel flotante
// que ya usa Combobox.jsx (position:relative en el wrap + position:absolute
// en el panel + listener de click-afuera para cerrar). La columna Imagen
// (fija) no pasa por acá -- se renderiza aparte, sin editor, directo en
// MemoriaBuilder.jsx.
function EncabezadoColumna({ columna, columnasOperandoFormula, onCambiar, onQuitar, onIniciarArrastre }) {
  const [panelAbierto, setPanelAbierto] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!panelAbierto) return undefined;
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setPanelAbierto(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [panelAbierto]);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 140 }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span
          draggable
          onDragStart={onIniciarArrastre}
          title="Arrastrar para reordenar"
          style={{ cursor: 'grab', color: 'var(--color-ink-muted)', display: 'flex', flexShrink: 0 }}
        >
          <GripVertical size={13} />
        </span>
        <input
          type="text"
          className={styles.celdaInput}
          value={columna.nombre}
          onChange={(e) => onCambiar('nombre', e.target.value)}
          placeholder="Nombre de la columna"
          style={headerControlStyle()}
        />
        <button
          type="button"
          onClick={() => setPanelAbierto((v) => !v)}
          title="Configurar columna"
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: panelAbierto ? 'var(--color-primary)' : 'var(--color-ink-muted)', flexShrink: 0, display: 'flex' }}
        >
          <Settings size={13} />
        </button>
        <button type="button" className={styles.deleteRowButton} onClick={onQuitar} title="Quitar columna" aria-label="Quitar columna" style={{ color: 'var(--color-danger-ink)', flexShrink: 0 }}>
          <Trash2 size={13} />
        </button>
      </div>
      <span style={{ fontSize: 'var(--text-label-size)', fontWeight: 400, textTransform: 'none', color: 'var(--color-ink-muted)' }}>
        {labelTipoColumna(columna.tipo)}
      </span>
      {panelAbierto && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 'var(--z-dropdown)',
            width: 220, display: 'flex', flexDirection: 'column', gap: 6, padding: 'var(--space-sm)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)', boxShadow: 'var(--shadow-floating)',
            textTransform: 'none', letterSpacing: 'normal', fontWeight: 400,
          }}
        >
          <select className={styles.celdaInput} value={columna.tipo} onChange={(e) => onCambiar('tipo', e.target.value)} style={headerControlStyle({ fontWeight: 400 })}>
            {TIPOS_COLUMNA.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          {columna.tipo === 'CALCULADA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 0', borderTop: '1px solid var(--color-border)' }}>
              <select className={styles.celdaInput} value={columna.formulaColumnaAClientId ?? ''} onChange={(e) => onCambiar('formulaColumnaAClientId', e.target.value)} style={headerControlStyle({ fontWeight: 400 })}>
                <option value="">Columna A…</option>
                {columnasOperandoFormula.filter((x) => x.clientId !== columna.clientId).map((x) => (
                  <option key={x.clientId} value={x.clientId}>{x.nombre || '(sin nombre)'}</option>
                ))}
              </select>
              <select className={styles.celdaInput} value={columna.formulaOperador ?? '*'} onChange={(e) => onCambiar('formulaOperador', e.target.value)} style={headerControlStyle({ fontWeight: 400 })}>
                {OPERADORES.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <select className={styles.celdaInput} value={columna.formulaColumnaBClientId ?? ''} onChange={(e) => onCambiar('formulaColumnaBClientId', e.target.value)} style={headerControlStyle({ fontWeight: 400 })}>
                <option value="">Columna B…</option>
                {columnasOperandoFormula.filter((x) => x.clientId !== columna.clientId).map((x) => (
                  <option key={x.clientId} value={x.clientId}>{x.nombre || '(sin nombre)'}</option>
                ))}
              </select>
            </div>
          )}
          {TIPOS_CON_TOTAL.includes(columna.tipo) && (
            <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontWeight: 400, textTransform: 'none' }}>
              <input type="checkbox" checked={Boolean(columna.mostrarTotal)} onChange={(e) => onCambiar('mostrarTotal', e.target.checked)} />
              Mostrar total
            </label>
          )}
        </div>
      )}
    </div>
  );
}

// Reordena una lista moviendo el elemento `clientIdOrigen` a la posición de
// `clientIdDestino` -- helper genérico, reusado para columnas y filas.
function moverElemento(lista, clientIdOrigen, clientIdDestino) {
  const i = lista.findIndex((x) => x.clientId === clientIdOrigen);
  const j = lista.findIndex((x) => x.clientId === clientIdDestino);
  if (i === -1 || j === -1 || i === j) return lista;
  const copia = [...lista];
  const [item] = copia.splice(i, 1);
  copia.splice(j, 0, item);
  return copia;
}

export function MemoriaBuilder({ value, onChange }) {
  const titulo = value.titulo ?? '';
  const columnas = value.columnas ?? [columnaImagenFija()];
  const filas = value.filas ?? [];
  const columnasOperandoFormula = columnas.filter((c) => TIPOS_OPERANDO_FORMULA.includes(c.tipo));
  const columnasConTotal = columnas.filter((c) => TIPOS_CON_TOTAL.includes(c.tipo) && c.mostrarTotal);
  const [colDrag, setColDrag] = useState(null);
  const [rowDrag, setRowDrag] = useState(null);

  function setTitulo(t) {
    onChange({ ...value, titulo: t });
  }

  function actualizarColumna(clientId, campo, val) {
    onChange({ ...value, columnas: columnas.map((c) => (c.clientId === clientId ? { ...c, [campo]: val } : c)) });
  }

  function agregarColumna() {
    onChange({ ...value, columnas: [...columnas, emptyColumna()] });
  }

  // Al quitar una columna hay que limpiar sus referencias en dos lados:
  // las celdas de cada fila que tuvieran un valor para ella, y cualquier
  // columna CALCULADA que la usara como operando (se resetea a Texto vacío
  // en vez de quedar con una fórmula rota apuntando a nada).
  function quitarColumna(clientId) {
    const nuevasColumnas = columnas
      .filter((c) => c.clientId !== clientId)
      .map((c) =>
        c.formulaColumnaAClientId === clientId || c.formulaColumnaBClientId === clientId
          ? { ...c, tipo: 'TEXTO', formulaColumnaAClientId: undefined, formulaOperador: undefined, formulaColumnaBClientId: undefined, mostrarTotal: false }
          : c
      );
    const nuevasFilas = filas.map((f) => {
      const { [clientId]: _quitado, ...resto } = f.valores ?? {};
      return { ...f, valores: resto };
    });
    onChange({ ...value, columnas: nuevasColumnas, filas: nuevasFilas });
  }

  function actualizarValorCelda(filaClientId, columnaClientId, val) {
    onChange({ ...value, filas: filas.map((f) => (f.clientId === filaClientId ? { ...f, valores: { ...f.valores, [columnaClientId]: val } } : f)) });
  }

  function agregarFila() {
    onChange({ ...value, filas: [...filas, emptyFila()] });
  }

  function quitarFila(clientId) {
    onChange({ ...value, filas: filas.filter((f) => f.clientId !== clientId) });
  }

  // La columna Imagen (clientId fijo 'imagen') nunca se pasa como origen ni
  // destino -- ni tiene grip ni el resto puede soltarse sobre ella, así que
  // moverElemento nunca la mueve ni algo cae encima de ella.
  function moverColumna(clientIdDestino) {
    if (colDrag && colDrag !== clientIdDestino) onChange({ ...value, columnas: moverElemento(columnas, colDrag, clientIdDestino) });
    setColDrag(null);
  }

  function moverFila(clientIdDestino) {
    if (rowDrag && rowDrag !== clientIdDestino) onChange({ ...value, filas: moverElemento(filas, rowDrag, clientIdDestino) });
    setRowDrag(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <Field label="Título (opcional)">
        {(p) => <TextInput {...p} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Visitas para Controles Topográficos" />}
      </Field>

      {/* Todo vive en la tabla -- pedido explícito: nombre/tipo/fórmula de
          cada columna se editan directo en su propio encabezado
          (EncabezadoColumna más arriba), y agregar columna/fila es un "+"
          DENTRO de la tabla (última columna del thead, última fila del
          tbody) en vez de botones sueltos por fuera. Ancha por naturaleza
          (columnas dinámicas, sin límite a propósito -- es literalmente el
          pedido: "una hoja tipo Excel") -- overflow-x:auto en vez de un
          rediseño tipo pestañas (acá no hay una segunda dimensión natural
          para agrupar, a diferencia de proveedores en Cuadro Comparativo). */}
      <div className={styles.card} style={{ overflowX: 'auto' }}>
        <table className={`${styles.table} ${styles.tableEditable}`}>
          <thead>
            <tr>
              {columnas.map((c) =>
                c.tipo === 'IMAGEN' ? (
                  <th key={c.clientId}>
                    {c.nombre}
                    <div style={{ fontSize: 'var(--text-label-size)', fontWeight: 400, textTransform: 'none', color: 'var(--color-ink-muted)' }}>(fija)</div>
                  </th>
                ) : (
                  <th
                    key={c.clientId}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); moverColumna(c.clientId); }}
                  >
                    <EncabezadoColumna
                      columna={c}
                      columnasOperandoFormula={columnasOperandoFormula}
                      onCambiar={(campo, val) => actualizarColumna(c.clientId, campo, val)}
                      onQuitar={() => quitarColumna(c.clientId)}
                      onIniciarArrastre={() => setColDrag(c.clientId)}
                    />
                  </th>
                )
              )}
              <th style={{ width: 1 }}>
                <button type="button" onClick={agregarColumna} title="Agregar columna" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)', display: 'flex' }}>
                  <Plus size={16} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr
                key={f.clientId}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); moverFila(f.clientId); }}
              >
                {columnas.map((c) => (
                  <td key={c.clientId}>
                    <CeldaMemoria columna={c} valor={f.valores?.[c.clientId]} valoresFila={f.valores} onChange={(v) => actualizarValorCelda(f.clientId, c.clientId, v)} />
                  </td>
                ))}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      draggable
                      onDragStart={() => setRowDrag(f.clientId)}
                      title="Arrastrar para reordenar"
                      style={{ cursor: 'grab', color: 'var(--color-ink-muted)', display: 'flex' }}
                    >
                      <GripVertical size={14} />
                    </span>
                    <button type="button" className={styles.deleteRowButton} onClick={() => quitarFila(f.clientId)} title="Quitar fila" aria-label="Quitar fila">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={columnas.length + 1} style={{ padding: 0 }}>
                <button
                  type="button"
                  onClick={agregarFila}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: '10px 16px', fontFamily: 'inherit', fontSize: 'var(--text-data-size)' }}
                >
                  <Plus size={14} />
                  Agregar fila
                </button>
              </td>
            </tr>
          </tbody>
          {columnasConTotal.length > 0 && filas.length > 0 && (
            <tfoot>
              <tr style={{ fontWeight: 600, background: 'var(--color-surface-sunken)' }}>
                {columnas.map((c, idx) => (
                  <td key={c.clientId}>
                    {columnasConTotal.includes(c) ? calcularTotalColumna(filas, c) : idx === 0 ? 'TOTAL' : ''}
                  </td>
                ))}
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
