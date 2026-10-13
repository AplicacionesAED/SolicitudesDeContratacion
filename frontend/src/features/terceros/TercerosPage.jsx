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
import { Download } from 'lucide-react';
import { formatCurrency } from '../../utils/solicitudes.js';
import { descargarCsv } from '../configuracion/usuarioUtils.js';
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

const DATO_LABEL = { nit: 'NIT', representanteLegal: 'representante legal', cedulaRepresentante: 'cédula del RL', correoFirma: 'correo de firma', direccionRepresentante: 'dirección', telefonoRepresentante: 'teléfono' };

// Mismas reglas que el selector de contratista de las solicitudes (SolicitudForm.jsx#terceroSeleccionable):
// por que un tercero SI o NO aparece disponible al armar una solicitud. Devuelve la lista de motivos de bloqueo.
function motivosBloqueo(t) {
  const motivos = [];
  if (!t.aprobadoDebidaDiligencia) motivos.push('Debida diligencia pendiente');
  if (!t.confidencialidad) motivos.push('Sin acuerdo de confidencialidad');
  const dias = diasRestantesDe(t.fechaVencimientoSagrilaft);
  if (dias !== null && dias <= 0) motivos.push('SAGRILAFT vencido');
  return motivos;
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
  const [vista, setVista] = usePersistentState('terceros-list:vista', 'todos');
  const [busqueda, setBusqueda] = usePersistentState('terceros-list:busqueda', '');
  const [pagina, setPagina] = usePersistentState('terceros-list:pagina', 1);

  function cargar() {
    setCargando(true);
    listTerceros()
      .then((res) => setTerceros(res.data))
      .finally(() => setCargando(false));
  }

  useEffect(cargar, []);

  // El backend responde con el contrato estandar: llegar aqui sin excepcion YA es exito.
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

  const VISTAS = useMemo(
    () => [
      { key: 'todos', label: 'Todos', test: () => true },
      { key: 'disponibles', label: 'Disponibles para contratar', test: (t) => motivosBloqueo(t).length === 0 },
      { key: 'bloqueados', label: 'No disponibles', test: (t) => motivosBloqueo(t).length > 0 },
      { key: 'renovar', label: 'SAGRILAFT por renovar', test: (t) => { const d = diasRestantesDe(t.fechaVencimientoSagrilaft); return d !== null && d <= 30; } },
      { key: 'contratados', label: 'Con solicitudes', test: (t) => t.totalSolicitudes > 0 },
      { key: 'datos', label: 'Datos por completar', test: (t) => t.totalSolicitudes > 0 && t.datosFaltantes.length > 0 },
    ],
    []
  );
  const conteos = useMemo(() => Object.fromEntries(VISTAS.map((v) => [v.key, terceros.filter(v.test).length])), [VISTAS, terceros]);
  const vistaActual = VISTAS.find((v) => v.key === vista) ?? VISTAS[0];

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return terceros.filter((t) => {
      if (!vistaActual.test(t)) return false;
      if (!q) return true;
      return t.razonSocial.toLowerCase().includes(q) || (t.nit ?? '').toLowerCase().includes(q) || t.especialidades.some((e) => e.nombre.toLowerCase().includes(q));
    });
  }, [terceros, vistaActual, busqueda]);

  const valueGetters = useMemo(
    () => ({
      razonSocial: (t) => t.razonSocial,
      disponible: (t) => motivosBloqueo(t).length,
      vctoSagrilaft: (t) => (t.fechaVencimientoSagrilaft ? new Date(t.fechaVencimientoSagrilaft).getTime() : null),
      contratado: (t) => t.valorContratado,
      datos: (t) => t.datosFaltantes.length,
    }),
    []
  );
  const { sortedRows, sort, toggleSort } = useSortableTable(filtrados, valueGetters);

  const totalPaginas = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginados = sortedRows.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  function exportar() {
    descargarCsv('terceros.csv', [
      ['Razón social', 'NIT', 'Disponible para contratar', 'Motivos', 'Vcto. SAGRILAFT', 'Solicitudes', 'Valor contratado', 'Datos faltantes', 'Especialidades'],
      ...sortedRows.map((t) => [
        t.razonSocial,
        t.nit ?? '',
        motivosBloqueo(t).length === 0 ? 'Sí' : 'No',
        motivosBloqueo(t).join('; '),
        t.fechaVencimientoSagrilaft ? new Date(t.fechaVencimientoSagrilaft).toLocaleDateString('es-CO') : '',
        t.totalSolicitudes,
        t.valorContratado,
        t.datosFaltantes.map((d) => DATO_LABEL[d]).join('; '),
        t.especialidades.map((e) => e.nombre).join('; '),
      ]),
    ]);
  }

  const valorTotal = terceros.reduce((sum, t) => sum + t.valorContratado, 0);
  const tarjetas = [
    { valor: terceros.length, label: 'Terceros', hint: `${conteos.contratados ?? 0} con solicitudes`, ir: 'todos' },
    { valor: conteos.disponibles ?? 0, label: 'Disponibles para contratar', hint: `${conteos.bloqueados ?? 0} no disponibles`, ir: 'disponibles' },
    { valor: conteos.renovar ?? 0, label: 'SAGRILAFT por renovar (30 días)', hint: 'Incluye los ya vencidos', ir: 'renovar' },
    { valor: conteos.datos ?? 0, label: 'Con solicitudes y datos incompletos', hint: valorTotal ? `${formatCurrency(valorTotal)} contratados en total` : 'Completa sus datos', ir: 'datos' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.listHeader}>
        <div>
          <h1 className={styles.title}>Terceros</h1>
          <p className={styles.subtitle}>Quién está disponible para contratar y por qué, cuánto se ha contratado con cada uno y qué datos le faltan.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <Button type="button" variant="secondary" onClick={exportar} disabled={sortedRows.length === 0}>
            <Download size={14} aria-hidden="true" /> Exportar CSV
          </Button>
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
            <button key={t.label} type="button" className={`${styles.kpiCard} ${extra.kpiClickable}`} onClick={() => { setVista(t.ir); setPagina(1); }}>
              <span className={styles.kpiValor}>{t.valor}</span>
              <span className={styles.kpiLabel}>{t.label}</span>
              <span className={extra.kpiHint}>{t.hint}</span>
            </button>
          ))}
        </div>
      )}

      {mensaje && (
        <div className={mensaje.tipo === 'error' ? styles.errorBanner : extra.okBanner} role={mensaje.tipo === 'error' ? 'alert' : 'status'}>
          {mensaje.texto}
        </div>
      )}

      <div className={extra.tabs} role="tablist" aria-label="Vistas del directorio">
        {VISTAS.map((v) => (
          <button key={v.key} type="button" role="tab" aria-selected={vistaActual.key === v.key} className={`${extra.tab} ${vistaActual.key === v.key ? extra.tabActive : ''}`} onClick={() => { setVista(v.key); setPagina(1); }}>
            {v.label}
            <span className={extra.tabCount}>{conteos[v.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className={styles.filters}>
        <label className={`${styles.filterField} ${styles.filterSearch}`}>
          <span>Buscar</span>
          <input type="text" className={styles.control} placeholder="Razón social, NIT o especialidad..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} aria-label="Buscar terceros" />
        </label>
        {busqueda && (
          <button type="button" className={styles.clearBtn} onClick={() => { setBusqueda(''); setPagina(1); }}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort(sort, 'razonSocial')}><SortHeader label="Tercero" sortKey="razonSocial" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'disponible')}><SortHeader label="Para contratar" sortKey="disponible" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'vctoSagrilaft')}><SortHeader label="SAGRILAFT" sortKey="vctoSagrilaft" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'contratado')}><SortHeader label="Contratación" sortKey="contratado" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'datos')}><SortHeader label="Datos" sortKey="datos" sort={sort} onSort={toggleSort} /></th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={5} className={styles.emptyState}>Cargando...</td></tr>
            ) : paginados.length === 0 ? (
              <tr><td colSpan={5} className={styles.emptyState}>{busqueda || vistaActual.key !== 'todos' ? 'No hay terceros en esta vista.' : 'Sin terceros registrados.'}</td></tr>
            ) : (
              paginados.map((t) => {
                const dias = diasRestantesDe(t.fechaVencimientoSagrilaft);
                const motivos = motivosBloqueo(t);
                const diasClass = dias === null ? '' : dias <= 0 ? extra.diasUrgente : dias <= 30 ? extra.diasPorVencer : extra.diasNormal;
                return (
                  <tr key={t.id} className={`${styles.clickableRow} ${dias !== null && dias <= 0 ? extra.filaCritica : dias !== null && dias <= 30 ? extra.filaAtencion : ''}`} onClick={() => navigate(`/terceros/${t.id}`)}>
                    <td>
                      <div className={extra.terceroCell}>
                        <span className={styles.personaNombre}>{t.razonSocial}</span>
                        <span className={extra.sub}>{t.nit ? `NIT ${t.nit}` : 'NIT sin registrar'}</span>
                        {t.especialidades.length > 0 && (
                          <span className={extra.miniChips}>
                            {t.especialidades.slice(0, 2).map((e) => <span key={e.id} className={extra.miniChip}>{e.nombre}</span>)}
                            {t.especialidades.length > 2 && <span className={extra.miniChip}>+{t.especialidades.length - 2}</span>}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {motivos.length === 0 ? (
                        <Badge variant="success" dot>Disponible</Badge>
                      ) : (
                        <>
                          <Badge variant="neutral" dot>No disponible</Badge>
                          <ul className={extra.motivos}>{motivos.map((m) => <li key={m}>{m}</li>)}</ul>
                        </>
                      )}
                    </td>
                    <td>
                      {t.fechaVencimientoSagrilaft ? (
                        <div className={extra.vencimiento}>
                          <span>{new Date(t.fechaVencimientoSagrilaft).toLocaleDateString('es-CO')}</span>
                          <span className={`${extra.diasRestantes} ${diasClass}`}>{dias <= 0 ? 'Vencido' : `${dias} días restantes`}</span>
                        </div>
                      ) : (
                        <span className={styles.muted}>Sin fecha</span>
                      )}
                    </td>
                    <td>
                      {t.totalSolicitudes > 0 ? (
                        <div className={extra.contratacion}>
                          <span className={styles.personaNombre}>{formatCurrency(t.valorContratado)}</span>
                          <span className={extra.sub}>{t.totalSolicitudes} solicitud{t.totalSolicitudes === 1 ? '' : 'es'} · última {new Date(t.ultimaSolicitud).toLocaleDateString('es-CO')}</span>
                        </div>
                      ) : (
                        <span className={styles.muted}>Sin solicitudes</span>
                      )}
                    </td>
                    <td>
                      {t.datosFaltantes.length === 0 ? (
                        <span className={extra.completo}>Completos</span>
                      ) : (
                        <span className={extra.faltan} title={`Faltan: ${t.datosFaltantes.map((d) => DATO_LABEL[d]).join(', ')}`}>
                          Faltan {t.datosFaltantes.length} de 6
                        </span>
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
