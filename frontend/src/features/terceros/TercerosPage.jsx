// Puerto de (app)/terceros/page.tsx -- lista + búsqueda + paginación (20 por
// página, el dataset real son ~390 terceros sincronizados de SharePoint) +
// sync manual. Filas con SAGRILAFT por vencer/vencido resaltadas -- mismo
// criterio de urgencia que la app original (≤20 días = rojo, ≤30 = amarillo).
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTerceros, sincronizarSharePoint } from '../../api/terceros.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { usuarioTienePermiso } from '../../utils/permisos.js';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { useSortableTable, ariaSort } from '../../hooks/useSortableTable.js';
import { usePersistentState } from '../../hooks/usePersistentState.js';
import styles from '../configuracion/Usuarios.module.css';
import extra from './Terceros.module.css';

const PAGE_SIZE = 20;

function diasRestantesDe(fecha) {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// 'vencido' (<=0 dias), 'por-vencer' (<=30), 'vigente' o 'sin-fecha'.
function estadoSagrilaft(t) {
  const dias = diasRestantesDe(t.fechaVencimientoSagrilaft);
  if (dias === null) return 'sin-fecha';
  if (dias <= 0) return 'vencido';
  if (dias <= 30) return 'por-vencer';
  return 'vigente';
}

export function TercerosPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const canCreate = usuarioTienePermiso(usuario, 'crear_terceros');
  const canManageEspecialidades = usuarioTienePermiso(usuario, 'gestionar_especialidades');

  const [terceros, setTerceros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [busqueda, setBusqueda] = usePersistentState('terceros-list:busqueda', '');
  const [pagina, setPagina] = usePersistentState('terceros-list:pagina', 1);
  const [filtroDd, setFiltroDd] = useState('');
  const [filtroSagrilaft, setFiltroSagrilaft] = useState('');

  function cargar() {
    setCargando(true);
    listTerceros()
      .then((res) => setTerceros(res.data))
      .finally(() => setCargando(false));
  }

  useEffect(cargar, []);

  // 2026-09-21: el backend ahora responde con el contrato estándar (`ok`
  // wrapper del resto de la app) -- `res.data = { message, total, errors }`,
  // sin campo `ok`. Llegar aquí sin excepción YA significa éxito: TypeError
  // de ApiRequestError con el mensaje específico de Azure/Graph se maneja en
  // el catch de abajo.
  async function handleSync() {
    setSincronizando(true);
    setMensaje(null);
    try {
      const res = await sincronizarSharePoint();
      setMensaje({ tipo: 'success', texto: res.data.message });
      cargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setSincronizando(false);
    }
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return terceros.filter((t) => {
      if (q && !(t.razonSocial.toLowerCase().includes(q) || t.nit.toLowerCase().includes(q))) return false;
      if (filtroDd === 'aprobada' && !t.aprobadoDebidaDiligencia) return false;
      if (filtroDd === 'pendiente' && t.aprobadoDebidaDiligencia) return false;
      if (filtroSagrilaft && estadoSagrilaft(t) !== filtroSagrilaft) return false;
      return true;
    });
  }, [terceros, busqueda, filtroDd, filtroSagrilaft]);

  const valueGetters = useMemo(
    () => ({
      razonSocial: (t) => t.razonSocial,
      debidaDiligencia: (t) => (t.aprobadoDebidaDiligencia ? 1 : 0),
      vctoSagrilaft: (t) => (t.fechaVencimientoSagrilaft ? new Date(t.fechaVencimientoSagrilaft).getTime() : null),
      confidencialidad: (t) => (t.confidencialidad ? 1 : 0),
    }),
    []
  );
  const { sortedRows, sort, toggleSort } = useSortableTable(filtrados, valueGetters);

  const totalPaginas = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginados = sortedRows.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  const hayFiltros = busqueda !== '' || filtroDd !== '' || filtroSagrilaft !== '';
  function limpiar() {
    setBusqueda('');
    setFiltroDd('');
    setFiltroSagrilaft('');
    setPagina(1);
  }
  const cambiar = (setter) => (e) => {
    setter(e.target.value);
    setPagina(1);
  };

  const tarjetas = [
    { valor: terceros.length, label: 'Terceros' },
    { valor: terceros.filter((t) => t.aprobadoDebidaDiligencia).length, label: 'Debida diligencia aprobada' },
    { valor: terceros.filter((t) => estadoSagrilaft(t) === 'por-vencer').length, label: 'SAGRILAFT por vencer (30 días)' },
    { valor: terceros.filter((t) => estadoSagrilaft(t) === 'vencido').length, label: 'SAGRILAFT vencido' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.listHeader}>
        <div>
          <h1 className={styles.title}>Terceros</h1>
          <p className={styles.subtitle}>Proveedores y contratistas, su debida diligencia y el vencimiento de SAGRILAFT.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <Button type="button" variant="secondary" onClick={handleSync} disabled={sincronizando}>
            {sincronizando ? 'Sincronizando...' : 'Sincronizar SharePoint'}
          </Button>
          {canManageEspecialidades && (
            <Button type="button" variant="secondary" onClick={() => navigate('/terceros/especialidades')}>
              Especialidades
            </Button>
          )}
          {canCreate && (
            <Button type="button" variant="primary" onClick={() => navigate('/terceros/nuevo')}>
              Nuevo tercero
            </Button>
          )}
        </div>
      </div>

      {!cargando && (
        <div className={styles.kpiRow}>
          {tarjetas.map((t) => (
            <div key={t.label} className={styles.kpiCard}>
              <span className={styles.kpiValor}>{t.valor}</span>
              <span className={styles.kpiLabel}>{t.label}</span>
            </div>
          ))}
        </div>
      )}

      {mensaje && (
        <div className={mensaje.tipo === 'error' ? styles.errorBanner : extra.okBanner} role={mensaje.tipo === 'error' ? 'alert' : 'status'}>
          {mensaje.texto}
        </div>
      )}

      <div className={styles.filters}>
        <label className={`${styles.filterField} ${styles.filterSearch}`}>
          <span>Buscar</span>
          <input type="text" className={styles.control} placeholder="Razón social o NIT..." value={busqueda} onChange={cambiar(setBusqueda)} aria-label="Buscar terceros" />
        </label>
        <label className={styles.filterField}>
          <span>Debida diligencia</span>
          <select className={styles.control} value={filtroDd} onChange={cambiar(setFiltroDd)}>
            <option value="">Todas</option>
            <option value="aprobada">Aprobada</option>
            <option value="pendiente">Pendiente</option>
          </select>
        </label>
        <label className={styles.filterField}>
          <span>SAGRILAFT</span>
          <select className={styles.control} value={filtroSagrilaft} onChange={cambiar(setFiltroSagrilaft)}>
            <option value="">Todos</option>
            <option value="vigente">Vigente</option>
            <option value="por-vencer">Por vencer (30 días)</option>
            <option value="vencido">Vencido</option>
            <option value="sin-fecha">Sin fecha</option>
          </select>
        </label>
        {hayFiltros && (
          <button type="button" className={styles.clearBtn} onClick={limpiar}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort(sort, 'razonSocial')}>
                <SortHeader label="Razón social" sortKey="razonSocial" sort={sort} onSort={toggleSort} />
              </th>
              <th aria-sort={ariaSort(sort, 'debidaDiligencia')}>
                <SortHeader label="Debida diligencia" sortKey="debidaDiligencia" sort={sort} onSort={toggleSort} />
              </th>
              <th aria-sort={ariaSort(sort, 'vctoSagrilaft')}>
                <SortHeader label="Vcto. SAGRILAFT" sortKey="vctoSagrilaft" sort={sort} onSort={toggleSort} />
              </th>
              <th aria-sort={ariaSort(sort, 'confidencialidad')}>
                <SortHeader label="Confidencialidad" sortKey="confidencialidad" sort={sort} onSort={toggleSort} />
              </th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={4} className={styles.emptyState}>
                  Cargando...
                </td>
              </tr>
            ) : paginados.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyState}>
                  {hayFiltros ? 'No se encontraron terceros.' : 'Sin terceros registrados.'}
                </td>
              </tr>
            ) : (
              paginados.map((t) => {
                const dias = diasRestantesDe(t.fechaVencimientoSagrilaft);
                const rowClass = dias !== null && dias <= 20 ? extra.rowUrgente : dias !== null && dias <= 30 ? extra.rowPorVencer : '';
                const diasClass = dias === null ? '' : dias <= 20 ? extra.diasUrgente : dias <= 30 ? extra.diasPorVencer : extra.diasNormal;
                return (
                  <tr key={t.id} className={`${styles.clickableRow} ${rowClass}`} onClick={() => navigate(`/terceros/${t.id}`)}>
                    <td>
                      <div className={styles.personaTexto}>
                        <span className={styles.personaNombre}>{t.razonSocial}</span>
                        <span className={styles.personaDoc}>{t.nit}</span>
                      </div>
                    </td>
                    <td>
                      {t.aprobadoDebidaDiligencia ? (
                        <Badge variant="success" dot>
                          Aprobada
                        </Badge>
                      ) : (
                        <Badge variant="neutral" dot>
                          Pendiente
                        </Badge>
                      )}
                    </td>
                    <td>
                      {t.fechaVencimientoSagrilaft ? (
                        <div className={extra.vencimiento}>
                          <span>{new Date(t.fechaVencimientoSagrilaft).toLocaleDateString('es-CO')}</span>
                          {dias !== null && <span className={`${extra.diasRestantes} ${diasClass}`}>{dias <= 0 ? 'Vencido' : `${dias} días restantes`}</span>}
                        </div>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>
                      {t.confidencialidad ? (
                        <Badge variant="info" dot>
                          Sí
                        </Badge>
                      ) : (
                        <Badge variant="neutral" dot>
                          No
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {!cargando && <Pagination page={paginaActual} pageSize={PAGE_SIZE} total={sortedRows.length} onPageChange={setPagina} />}
      </div>
    </div>
  );
}
