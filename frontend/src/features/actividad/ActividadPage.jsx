// Puerto de (app)/configuracion/presencia/page.tsx -- monitoreo de presencia
// en tiempo real (SSE) + historial/sesiones paginados + estadísticas.
// Simplificación deliberada respecto al original: no hay un modal de detalle
// por usuario al hacer clic en una fila de Presencia -- en vez de eso, un
// clic salta a la pestaña Historial ya filtrada por ese usuario, reutilizando
// la misma tabla en vez de duplicar la vista en un modal nuevo (el <Modal>
// del proyecto se reserva para confirmaciones cortas de 1-2 campos antes de
// una transición de estado, ver el comentario en components/ui/Modal.jsx).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Clock, Monitor, Calendar, Download, LogIn, LogOut, Eye, MousePointer, Zap, Pause } from 'lucide-react';
import { getHistorial, getSesiones, getStats, urlExportarCsv } from '../../api/actividad.js';
import { API_BASE_URL } from '../../api/client.js';
import { ROL_LABELS } from '../../utils/permisos.js';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { useSortableTable, ariaSort } from '../../hooks/useSortableTable.js';
import styles from './Actividad.module.css';

const ESTADO_CONFIG = {
  activo: { label: 'Activo', dot: styles.dotActivo, pill: styles.pillActivo, orden: 0 },
  ausente: { label: 'Ausente', dot: styles.dotAusente, pill: styles.pillAusente, orden: 1 },
  desconectado: { label: 'Desconectado', dot: styles.dotDesconectado, pill: styles.pillDesconectado, orden: 2 },
};

const TIPO_ACTIVIDAD_CONFIG = {
  login: { label: 'Inicio de sesión', icon: LogIn },
  logout: { label: 'Cierre de sesión', icon: LogOut },
  heartbeat: { label: 'Actividad', icon: Zap },
  idle: { label: 'Inactivo', icon: Pause },
  active: { label: 'Activo de nuevo', icon: Zap },
  page_view: { label: 'Página visitada', icon: Eye },
  action: { label: 'Acción realizada', icon: MousePointer },
};

const TABS = [
  { key: 'presencia', label: 'Presencia', icon: Activity },
  { key: 'historial', label: 'Historial', icon: Clock },
  { key: 'sesiones', label: 'Sesiones', icon: Monitor },
  { key: 'estadisticas', label: 'Estadísticas', icon: Calendar },
];

function tiempoRelativo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Hace instantes';
  if (mins < 60) return `Hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} día${dias !== 1 ? 's' : ''}`;
}

function formatDuracion(seg) {
  if (!seg) return '—';
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatFecha(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

function StatsPanel({ desde, hasta }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setStats(null);
    getStats(desde, hasta).then((res) => setStats(res.data));
  }, [desde, hasta]);

  if (!stats) return <p className={styles.emptyState}>Cargando estadísticas...</p>;

  const maxSesionesDia = Math.max(...stats.sesionesPorDia.map((d) => d.total), 1);
  const maxHora = Math.max(...stats.horasPico.map((h) => h.total), 1);
  const maxTipo = Math.max(...stats.actividadesPorTipo.map((a) => a.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className={styles.statCards}>
        {[
          { label: 'Usuarios totales', value: stats.resumen.totalUsuarios },
          { label: 'Actualmente activos', value: stats.resumen.usuariosActivos },
          { label: 'Con sesión en periodo', value: stats.resumen.usuariosConSesion },
          { label: 'Sesiones totales', value: stats.resumen.totalSesiones },
          { label: 'Sesiones completadas', value: stats.resumen.sesionesCompletadas },
          { label: 'Duración media', value: `${stats.resumen.duracionMediaMinutos} min` },
        ].map((s) => (
          <div key={s.label} className={styles.statCard}>
            <span className={styles.statLabel}>{s.label}</span>
            <p className={styles.statValue}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Sesiones por día</h3>
        {stats.sesionesPorDia.length === 0 ? (
          <p className={styles.emptyState}>Sin datos en el periodo</p>
        ) : (
          <div className={styles.barChart}>
            {stats.sesionesPorDia.map((d) => (
              <div key={d.dia} className={styles.barChartCol} title={`${d.dia}: ${d.total} sesiones`}>
                <div className={styles.bar} style={{ height: `${(d.total / maxSesionesDia) * 100}%` }} />
                <span className={styles.barLabel}>{d.dia.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Actividad por tipo</h3>
        {stats.actividadesPorTipo.length === 0 ? (
          <p className={styles.emptyState}>Sin datos en el periodo</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {stats.actividadesPorTipo.map((a) => (
              <div key={a.tipo} className={styles.barRow}>
                <span className={styles.barRowLabel}>{TIPO_ACTIVIDAD_CONFIG[a.tipo]?.label ?? a.tipo}</span>
                <div className={styles.barRowTrack}>
                  <div className={styles.barRowFill} style={{ width: `${(a.count / maxTipo) * 100}%` }} />
                </div>
                <span className={styles.barRowValue}>{a.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Horas pico</h3>
        <div className={styles.barChart}>
          {Array.from({ length: 24 }, (_, i) => {
            const total = stats.horasPico.find((h) => h.hora === i)?.total ?? 0;
            return (
              <div key={i} className={styles.barChartCol} title={`${i}:00 — ${total} sesiones`}>
                <div className={styles.bar} style={{ height: total > 0 ? `${(total / maxHora) * 100}%` : '2px' }} />
                {i % 3 === 0 && <span className={styles.barLabel}>{i}h</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ActividadPage() {
  const [activeTab, setActiveTab] = useState('presencia');

  // Presencia (SSE)
  const [usuarios, setUsuarios] = useState([]);
  const [conectado, setConectado] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroRol, setFiltroRol] = useState('todos');
  const eventSourceRef = useRef(null);

  const conectarSSE = useCallback(() => {
    eventSourceRef.current?.close();
    const es = new EventSource(`${API_BASE_URL}/presence/stream`, { withCredentials: true });
    eventSourceRef.current = es;
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          setUsuarios(data);
          setConectado(true);
        }
      } catch {
        // ignorar
      }
    };
    es.onerror = () => {
      setConectado(false);
      es.close();
      setTimeout(conectarSSE, 5000);
    };
  }, []);

  useEffect(() => {
    conectarSSE();
    return () => eventSourceRef.current?.close();
  }, [conectarSSE]);

  // Historial
  const [historial, setHistorial] = useState([]);
  const [historialPagina, setHistorialPagina] = useState(1);
  const [historialTotal, setHistorialTotal] = useState(0);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroUsuarioId, setFiltroUsuarioId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const fetchHistorial = useCallback(() => {
    getHistorial({ userId: filtroUsuarioId, tipo: filtroTipo, desde: fechaDesde, hasta: fechaHasta, page: historialPagina, limit: 20 }).then((res) => {
      setHistorial(res.data);
      setHistorialTotal(res.meta?.pagination?.total ?? 0);
    });
  }, [filtroUsuarioId, filtroTipo, fechaDesde, fechaHasta, historialPagina]);

  useEffect(() => {
    if (activeTab === 'historial') fetchHistorial();
  }, [activeTab, fetchHistorial]);

  // Sesiones
  const [sesiones, setSesiones] = useState([]);
  const [sesionPagina, setSesionPagina] = useState(1);
  const [sesionTotal, setSesionTotal] = useState(0);

  const fetchSesiones = useCallback(() => {
    getSesiones({ userId: filtroUsuarioId, desde: fechaDesde, hasta: fechaHasta, page: sesionPagina, limit: 20 }).then((res) => {
      setSesiones(res.data);
      setSesionTotal(res.meta?.pagination?.total ?? 0);
    });
  }, [filtroUsuarioId, fechaDesde, fechaHasta, sesionPagina]);

  useEffect(() => {
    if (activeTab === 'sesiones') fetchSesiones();
  }, [activeTab, fetchSesiones]);

  const conteos = usuarios.reduce((acc, u) => ({ ...acc, [u.estado]: (acc[u.estado] ?? 0) + 1 }), { activo: 0, ausente: 0, desconectado: 0 });
  const rolesUnicos = [...new Set(usuarios.flatMap((u) => u.roles ?? []))].sort();

  const filtrados = useMemo(() => {
    return usuarios
      .filter((u) => filtroEstado === 'todos' || u.estado === filtroEstado)
      .filter((u) => filtroRol === 'todos' || (u.roles ?? []).includes(filtroRol))
      .filter((u) => {
        if (!busqueda) return true;
        const q = busqueda.toLowerCase();
        return u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      })
      .sort((a, b) => ESTADO_CONFIG[a.estado].orden - ESTADO_CONFIG[b.estado].orden || a.nombre.localeCompare(b.nombre));
  }, [usuarios, filtroEstado, filtroRol, busqueda]);

  const presenciaValueGetters = useMemo(
    () => ({
      estado: (u) => ESTADO_CONFIG[u.estado]?.label ?? u.estado,
      nombre: (u) => u.nombre,
      perfiles: (u) => (u.roles ?? []).map((r) => ROL_LABELS[r] ?? r).join(', '),
      frentes: (u) => (u.frentes ?? []).map((f) => f.nombre).join(', '),
      ultimaActividad: (u) => (u.ultimaActividad ? new Date(u.ultimaActividad).getTime() : null),
      ultimaConexion: (u) => (u.ultimaConexion ? new Date(u.ultimaConexion).getTime() : null),
    }),
    []
  );
  const { sortedRows: presenciaSorted, sort: presenciaSort, toggleSort: presenciaToggleSort } = useSortableTable(filtrados, presenciaValueGetters);

  function verHistorialDeUsuario(userId) {
    setFiltroUsuarioId(String(userId));
    setHistorialPagina(1);
    setActiveTab('historial');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Actividad de usuarios</h1>
          <p className={styles.subtitle}>Monitoreo de presencia y actividad en tiempo real</p>
        </div>
        <span className={styles.connLive}>
          <span className={`${styles.connDot} ${conectado ? styles.connDotOn : styles.connDotOff}`} />
          {conectado ? 'En tiempo real' : 'Reconectando…'}
        </span>
      </div>

      <div className={styles.tabs}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" className={`${styles.tab} ${activeTab === key ? styles.tabActive : ''}`} onClick={() => setActiveTab(key)}>
            <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'presencia' && (
        <>
          <div className={styles.statCards}>
            {Object.entries(ESTADO_CONFIG).map(([estado, cfg]) => (
              <div key={estado} className={`${styles.statCard} ${filtroEstado === estado ? styles.statCardActive : ''}`} onClick={() => setFiltroEstado(filtroEstado === estado ? 'todos' : estado)}>
                <span className={styles.statLabel}>
                  <span className={`${styles.dot} ${cfg.dot}`} />
                  {cfg.label}
                </span>
                <p className={styles.statValue}>{conteos[estado] ?? 0}</p>
              </div>
            ))}
          </div>

          <div className={styles.filterRow}>
            <input className={styles.searchBar} type="text" placeholder="Buscar por nombre o email..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            <select className={styles.select} value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
              <option value="todos">Todos los roles</option>
              {rolesUnicos.map((r) => (
                <option key={r} value={r}>{ROL_LABELS[r] ?? r}</option>
              ))}
            </select>
            <a className={styles.exportLink} href={urlExportarCsv('actividades')} target="_blank" rel="noreferrer">
              <Download size={14} strokeWidth={1.75} aria-hidden="true" />
              Exportar
            </a>
          </div>

          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th aria-sort={ariaSort(presenciaSort, 'estado')}><SortHeader label="Estado" sortKey="estado" sort={presenciaSort} onSort={presenciaToggleSort} /></th>
                  <th aria-sort={ariaSort(presenciaSort, 'nombre')}><SortHeader label="Nombre" sortKey="nombre" sort={presenciaSort} onSort={presenciaToggleSort} /></th>
                  <th aria-sort={ariaSort(presenciaSort, 'perfiles')}><SortHeader label="Perfiles" sortKey="perfiles" sort={presenciaSort} onSort={presenciaToggleSort} /></th>
                  <th aria-sort={ariaSort(presenciaSort, 'frentes')}><SortHeader label="Frentes" sortKey="frentes" sort={presenciaSort} onSort={presenciaToggleSort} /></th>
                  <th aria-sort={ariaSort(presenciaSort, 'ultimaActividad')}><SortHeader label="Última actividad" sortKey="ultimaActividad" sort={presenciaSort} onSort={presenciaToggleSort} /></th>
                  <th aria-sort={ariaSort(presenciaSort, 'ultimaConexion')}><SortHeader label="Última conexión" sortKey="ultimaConexion" sort={presenciaSort} onSort={presenciaToggleSort} /></th>
                </tr>
              </thead>
              <tbody>
                {presenciaSorted.map((u) => {
                  const cfg = ESTADO_CONFIG[u.estado];
                  return (
                    <tr key={u.id} onClick={() => verHistorialDeUsuario(u.id)}>
                      <td>
                        <span className={cfg.pill}>
                          <span className={`${styles.dot} ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td>
                        <div>{u.nombre}</div>
                        <div style={{ fontSize: 'var(--text-label-size)', color: 'var(--color-ink-muted)' }}>{u.email}</div>
                      </td>
                      <td>
                        {(u.roles ?? []).map((r) => (
                          <span key={r} className={styles.rolChip} style={{ marginRight: 4 }}>{ROL_LABELS[r] ?? r}</span>
                        ))}
                      </td>
                      <td>{(u.frentes ?? []).map((f) => f.nombre).join(', ') || '—'}</td>
                      <td>{tiempoRelativo(u.ultimaActividad)}</td>
                      <td>{u.ultimaConexion ? formatFecha(u.ultimaConexion) : <span style={{ color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>Nunca</span>}</td>
                    </tr>
                  );
                })}
                {filtrados.length === 0 && (
                  <tr><td colSpan={6} className={styles.emptyState}>No se encontraron usuarios</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(activeTab === 'historial' || activeTab === 'sesiones') && (
        <div className={styles.filterRow}>
          {activeTab === 'historial' && (
            <select className={styles.select} value={filtroTipo} onChange={(e) => { setFiltroTipo(e.target.value); setHistorialPagina(1); }}>
              <option value="todos">Todos los tipos</option>
              {Object.entries(TIPO_ACTIVIDAD_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          )}
          <input className={styles.dateInput} type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          <span style={{ color: 'var(--color-ink-muted)', fontSize: 'var(--text-label-size)' }}>a</span>
          <input className={styles.dateInput} type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          {filtroUsuarioId && (
            <button type="button" className={styles.exportLink} onClick={() => setFiltroUsuarioId('')}>Quitar filtro de usuario</button>
          )}
          <a className={styles.exportLink} style={{ marginLeft: 'auto' }} href={urlExportarCsv(activeTab === 'historial' ? 'actividades' : 'sesiones', { userId: filtroUsuarioId, desde: fechaDesde, hasta: fechaHasta })} target="_blank" rel="noreferrer">
            <Download size={14} strokeWidth={1.75} aria-hidden="true" />
            Exportar CSV
          </a>
        </div>
      )}

      {activeTab === 'historial' && (
        <div className={styles.card}>
          {historial.length === 0 ? (
            <p className={styles.emptyState}>Sin registros</p>
          ) : (
            historial.map((a) => {
              const cfg = TIPO_ACTIVIDAD_CONFIG[a.tipo] ?? TIPO_ACTIVIDAD_CONFIG.action;
              const Icon = cfg.icon;
              return (
                <div key={a.id} className={styles.timelineRow}>
                  <span className={styles.timelineIcon}><Icon size={14} strokeWidth={1.75} aria-hidden="true" /></span>
                  <div>
                    <div><strong>{a.usuario?.nombre}</strong> · {cfg.label}</div>
                    {a.descripcion && <div style={{ fontSize: 'var(--text-data-size)', color: 'var(--color-ink-secondary)' }}>{a.descripcion}</div>}
                    <div style={{ fontSize: 'var(--text-label-size)', color: 'var(--color-ink-muted)' }}>
                      {formatFecha(a.creadoEn)}{a.ip && a.ip !== 'unknown' && ` · ${a.ip}`}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <Pagination page={historialPagina} pageSize={20} total={historialTotal} onPageChange={setHistorialPagina} />
        </div>
      )}

      {activeTab === 'sesiones' && (
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr><th>Usuario</th><th>Inicio</th><th>Fin</th><th>Duración</th><th>Dispositivo</th><th>IP</th></tr>
            </thead>
            <tbody>
              {sesiones.map((s) => (
                <tr key={s.id}>
                  <td>{s.usuario?.nombre}</td>
                  <td>{formatFecha(s.inicio)}</td>
                  <td>{s.fin ? formatFecha(s.fin) : <span style={{ color: '#2f9e5c', fontWeight: 600 }}>En curso</span>}</td>
                  <td>{formatDuracion(s.duracionSeg)}</td>
                  <td>{s.navegador ?? '—'} · {s.sistemaOp ?? '—'} · {s.dispositivo ?? '—'}</td>
                  <td>{s.ip && s.ip !== 'unknown' ? s.ip : '—'}</td>
                </tr>
              ))}
              {sesiones.length === 0 && <tr><td colSpan={6} className={styles.emptyState}>Sin sesiones</td></tr>}
            </tbody>
          </table>
          <Pagination page={sesionPagina} pageSize={20} total={sesionTotal} onPageChange={setSesionPagina} />
        </div>
      )}

      {activeTab === 'estadisticas' && (
        <StatsPanel desde={fechaDesde || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} hasta={fechaHasta || new Date().toISOString().split('T')[0]} />
      )}
    </div>
  );
}
