// Puerto de la barra de filtros de (app)/solicitudes/page.tsx (recuperada de
// git history, commit b2ccb45) -- búsqueda + estado/tipo siempre visibles,
// un panel "Filtros" plegable con proyecto/frente/fechas/valor. Los que el
// backend ya soporta como query param (estado, tipo, proyectoId, frenteId,
// fechaDesde, fechaHasta) se mandan al servidor -- valorMin/valorMax se
// filtran en memoria, igual que el original (nunca fueron parámetros de la
// API). No se portó la tabla con otrosís expandibles/paginación del
// original -- esta migración ya tenía su propia tabla con columnas
// ordenables (SortHeader), fuera de alcance de este pedido (solo los
// filtros).
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import { listSolicitudes } from '../../api/solicitudes.js';
import { listProyectos } from '../../api/proyectos.js';
import { listFrentes } from '../../api/frentes.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { usuarioTienePermiso } from '../../utils/permisos.js';
import { TIPO_SOLICITUD_LABELS, ESTADO_LABELS, CATEGORIA_LABELS, formatCurrency, formatearMiles, soloDigitos, categoriaSlug } from '../../utils/solicitudes.js';
import { SolicitudBadge } from './SolicitudBadge.jsx';
import { HistoricoBadge } from './HistoricoBadge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput, Select } from '../../components/ui/Field.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { useSortableTable, ariaSort } from '../../hooks/useSortableTable.js';
import { usePersistentState } from '../../hooks/usePersistentState.js';
import styles from './Solicitudes.module.css';

const ESTADO_OPTIONS = Object.entries(ESTADO_LABELS).map(([value, label]) => ({ value, label }));
const TIPO_OPTIONS = Object.entries(TIPO_SOLICITUD_LABELS).map(([value, label]) => ({ value, label }));

export function SolicitudesPage({ categoria }) {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const canCrear = usuarioTienePermiso(usuario, `crear_solicitudes_${categoria === 'DIRECTA' ? 'directas' : 'indirectas'}`);
  const slug = categoriaSlug(categoria);

  const [solicitudes, setSolicitudes] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [frentes, setFrentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [busqueda, setBusqueda] = usePersistentState(`solicitudes-list:busqueda:${slug}`, '');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [mostrarAvanzados, setMostrarAvanzados] = useState(false);
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [filtroFrente, setFiltroFrente] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroValorMin, setFiltroValorMin] = useState('');
  const [filtroValorMax, setFiltroValorMax] = useState('');

  useEffect(() => {
    listProyectos().then((res) => setProyectos(res.data)).catch(() => setProyectos([]));
    listFrentes().then((res) => setFrentes(res.data)).catch(() => setFrentes([]));
  }, []);

  function cargar() {
    setCargando(true);
    listSolicitudes({
      categoria,
      estado: filtroEstado,
      tipo: filtroTipo,
      proyectoId: filtroProyecto,
      frenteId: filtroFrente,
      fechaDesde: filtroFechaDesde,
      fechaHasta: filtroFechaHasta,
    })
      .then((res) => setSolicitudes(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }

  useEffect(cargar, [categoria, filtroEstado, filtroTipo, filtroProyecto, filtroFrente, filtroFechaDesde, filtroFechaHasta]); // eslint-disable-line react-hooks/exhaustive-deps

  // frentes.js devuelve la instancia cruda (snake_case, proyecto_id) -- ver
  // la nota en CLAUDE.md sobre esta diferencia con tercero/solicitud.
  const frentesFiltrados = filtroProyecto ? frentes.filter((f) => String(f.proyecto_id) === String(filtroProyecto)) : frentes;

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return solicitudes.filter((s) => {
      if (q) {
        const match =
          s.consecutivo.toLowerCase().includes(q) ||
          (s.tercero?.razonSocial ?? '').toLowerCase().includes(q) ||
          (s.tercero?.nit ?? '').toLowerCase().includes(q) ||
          (s.solicitante?.nombre ?? '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filtroValorMin && s.valorFinal != null && Number(s.valorFinal) < Number(filtroValorMin)) return false;
      if (filtroValorMax && s.valorFinal != null && Number(s.valorFinal) > Number(filtroValorMax)) return false;
      return true;
    });
  }, [solicitudes, busqueda, filtroValorMin, filtroValorMax]);

  const valueGetters = useMemo(
    () => ({
      consecutivo: (s) => s.consecutivo,
      tipo: (s) => TIPO_SOLICITUD_LABELS[s.tipo] ?? s.tipo,
      tercero: (s) => s.tercero?.razonSocial ?? '',
      valorFinal: (s) => Number(s.valorFinal ?? 0),
      fechaSolicitud: (s) => new Date(s.fechaSolicitud).getTime(),
      estado: (s) => ESTADO_LABELS[s.estado] ?? s.estado,
    }),
    []
  );
  const { sortedRows, sort, toggleSort } = useSortableTable(filtradas, valueGetters);

  const avanzadosActivos = [filtroProyecto, filtroFrente, filtroFechaDesde, filtroFechaHasta, filtroValorMin, filtroValorMax].filter(Boolean).length;
  const hayFiltros = Boolean(busqueda || filtroEstado || filtroTipo || avanzadosActivos > 0);

  function limpiarTodo() {
    setBusqueda('');
    setFiltroEstado('');
    setFiltroTipo('');
    setFiltroProyecto('');
    setFiltroFrente('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroValorMin('');
    setFiltroValorMax('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className={styles.header}>
        <h1 className={styles.title}>Solicitudes {CATEGORIA_LABELS[categoria]}s</h1>
        {canCrear && (
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button type="button" variant="secondary" onClick={() => navigate(`/solicitudes-${slug}/importar-historico`)}>Importar histórico</Button>
            <Button type="button" onClick={() => navigate(`/solicitudes-${slug}/nueva`)}>Nueva solicitud</Button>
          </div>
        )}
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.card}>
        <div className={styles.filterMainRow}>
          <div className={styles.filterSearchWrap}>
            <Search size={14} className={styles.filterSearchIcon} aria-hidden="true" />
            <input
              className={`${styles.searchBar} ${styles.filterSearchInput}`}
              type="text"
              placeholder="Buscar por consecutivo, tercero o solicitante..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <Select className={styles.filterSelect} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>

          <Select className={styles.filterSelect} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {TIPO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>

          <button
            type="button"
            className={`${styles.filterToggle} ${avanzadosActivos > 0 ? styles.filterToggleActive : ''}`}
            onClick={() => setMostrarAvanzados((v) => !v)}
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            Filtros
            {avanzadosActivos > 0 && <span className={styles.filterBadge}>{avanzadosActivos}</span>}
            {mostrarAvanzados ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
          </button>

          {hayFiltros && (
            <button type="button" className={styles.filterClear} onClick={limpiarTodo}>
              <X size={13} aria-hidden="true" />
              Limpiar
            </button>
          )}
        </div>

        {mostrarAvanzados && (
          <div className={styles.filterAdvancedGrid}>
            <Field label="Proyecto">
              {(p) => (
                <Select {...p} value={filtroProyecto} onChange={(e) => { setFiltroProyecto(e.target.value); setFiltroFrente(''); }}>
                  <option value="">Todos los proyectos</option>
                  {proyectos.map((pr) => (
                    <option key={pr.id} value={pr.id}>{pr.nombre}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Frente">
              {(p) => (
                <Select {...p} value={filtroFrente} onChange={(e) => setFiltroFrente(e.target.value)} disabled={frentesFiltrados.length === 0}>
                  <option value="">Todos los frentes</option>
                  {frentesFiltrados.map((f) => (
                    <option key={f.id} value={f.id}>{f.nombre}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Fecha desde">
              {(p) => <TextInput {...p} type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} />}
            </Field>
            <Field label="Fecha hasta">
              {(p) => <TextInput {...p} type="date" value={filtroFechaHasta} min={filtroFechaDesde || undefined} onChange={(e) => setFiltroFechaHasta(e.target.value)} />}
            </Field>
            {/* Dinero -- nunca type="number" (ver el comentario grande en
                CuadroComparativoBuilder.jsx#"Valor unitario"): texto +
                inputMode="numeric" + soloDigitos()/formatearMiles() deja
                pegar "1.500.000" (con puntos de miles) o "1500000" (sin
                puntos) y en los dos casos termina guardado como dígitos
                crudos, que es justo lo que `Number(filtroValorMin)` de
                arriba ya espera. */}
            <Field label="Valor mínimo">
              {(p) => <TextInput {...p} type="text" inputMode="numeric" placeholder="0" value={formatearMiles(filtroValorMin)} onChange={(e) => setFiltroValorMin(soloDigitos(e.target.value))} />}
            </Field>
            <Field label="Valor máximo">
              {(p) => <TextInput {...p} type="text" inputMode="numeric" placeholder="Sin límite" value={formatearMiles(filtroValorMax)} onChange={(e) => setFiltroValorMax(soloDigitos(e.target.value))} />}
            </Field>
          </div>
        )}

        {!cargando && (
          <p className={styles.filterResultsCount}>
            {filtradas.length} solicitud{filtradas.length === 1 ? '' : 'es'} encontrada{filtradas.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort(sort, 'consecutivo')}><SortHeader label="Consecutivo" sortKey="consecutivo" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'tipo')}><SortHeader label="Tipo" sortKey="tipo" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'tercero')}><SortHeader label="Contratista" sortKey="tercero" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'valorFinal')}><SortHeader label="Valor" sortKey="valorFinal" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'fechaSolicitud')}><SortHeader label="Fecha" sortKey="fechaSolicitud" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'estado')}><SortHeader label="Estado" sortKey="estado" sort={sort} onSort={toggleSort} /></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((s) => (
              <tr key={s.id} onClick={() => navigate(`/solicitudes/${s.id}`)} style={{ cursor: 'pointer' }}>
                <td style={{ fontFamily: 'monospace' }}>{s.consecutivo}</td>
                <td>{TIPO_SOLICITUD_LABELS[s.tipo] ?? s.tipo}</td>
                <td>{s.tercero?.razonSocial ?? '—'}</td>
                <td>{s.valorFinal ? formatCurrency(s.valorFinal) : '—'}</td>
                <td>{new Date(s.fechaSolicitud).toLocaleDateString('es-CO')}</td>
                <td>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <SolicitudBadge estado={s.estado} />
                    {s.importadoHistorico && <HistoricoBadge numeroOtrosi={s.numeroOtrosi} />}
                  </span>
                </td>
              </tr>
            ))}
            {!cargando && sortedRows.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.emptyState}>{hayFiltros ? 'Sin resultados, prueba ajustando los filtros.' : 'Sin solicitudes todavía.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
