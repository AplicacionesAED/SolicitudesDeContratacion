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
import styles from './Terceros.module.css';

const PAGE_SIZE = 20;

function diasRestantesDe(fecha) {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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
    if (!q) return terceros;
    return terceros.filter((t) => t.razonSocial.toLowerCase().includes(q) || t.nit.toLowerCase().includes(q));
  }, [terceros, busqueda]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Terceros / Debida Diligencia</h1>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: 'var(--text-data-size)', margin: '4px 0 0' }}>Gestión de proveedores y contratistas</p>
        </div>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={handleSync} disabled={sincronizando}>
            {sincronizando ? 'Sincronizando…' : 'Sincronizar SharePoint'}
          </Button>
          {canManageEspecialidades && (
            <Button type="button" variant="secondary" onClick={() => navigate('/terceros/especialidades')}>
              Especialidades
            </Button>
          )}
          {canCreate && <Button type="button" onClick={() => navigate('/terceros/nuevo')}>Nuevo tercero</Button>}
        </div>
      </div>

      {mensaje && <p className={mensaje.tipo === 'error' ? styles.errorBanner : styles.diasNormal}>{mensaje.texto}</p>}

      <input
        type="text"
        className={styles.searchBar}
        placeholder="Buscar por razón social o NIT..."
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setPagina(1);
        }}
      />

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort(sort, 'razonSocial')}><SortHeader label="Razón Social" sortKey="razonSocial" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'debidaDiligencia')}><SortHeader label="Debida diligencia" sortKey="debidaDiligencia" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'vctoSagrilaft')}><SortHeader label="Vcto. SAGRILAFT" sortKey="vctoSagrilaft" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'confidencialidad')}><SortHeader label="Confidencialidad" sortKey="confidencialidad" sort={sort} onSort={toggleSort} /></th>
            </tr>
          </thead>
          <tbody>
            {paginados.map((t) => {
              const dias = diasRestantesDe(t.fechaVencimientoSagrilaft);
              const rowClass = dias !== null && dias <= 20 ? styles.rowUrgente : dias !== null && dias <= 30 ? styles.rowPorVencer : '';
              const diasClass = dias === null ? '' : dias <= 20 ? styles.diasUrgente : dias <= 30 ? styles.diasPorVencer : styles.diasNormal;
              return (
                <tr
                  key={t.id}
                  className={`${styles.clickableRow} ${rowClass}`}
                  onClick={() => navigate(`/terceros/${t.id}`)}
                >
                  <td>{t.razonSocial}</td>
                  <td>{t.aprobadoDebidaDiligencia ? <Badge variant="success" dot>Sí</Badge> : <Badge variant="neutral" dot>No</Badge>}</td>
                  <td>
                    {t.fechaVencimientoSagrilaft ? (
                      <div className={styles.tablaFilaVencimiento}>
                        <span>{new Date(t.fechaVencimientoSagrilaft).toLocaleDateString('es-CO')}</span>
                        {dias !== null && <span className={`${styles.diasRestantes} ${diasClass}`}>{dias <= 0 ? 'Vencido' : `${dias} días restantes`}</span>}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{t.confidencialidad ? <Badge variant="info" dot>Sí</Badge> : <Badge variant="neutral" dot>No</Badge>}</td>
                </tr>
              );
            })}
            {!cargando && paginados.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.emptyState}>{busqueda ? 'No se encontraron terceros.' : 'Sin terceros registrados.'}</td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination page={paginaActual} pageSize={PAGE_SIZE} total={sortedRows.length} onPageChange={setPagina} />
      </div>
    </div>
  );
}
