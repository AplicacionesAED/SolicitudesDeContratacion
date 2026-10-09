// Frentes con el diseno del HRMS y Cartera (migracion de diseno 2026-10-09): tarjetas, filtros (busqueda y proyecto),
// tabla clickeable y una tarjeta para crear. Usuarios asignados y aprobadores viven en FrenteDetallePage.jsx.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listFrentes, createFrente } from '../../api/frentes.js';
import { listProyectos } from '../../api/proyectos.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput, Select } from '../../components/ui/Field.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { useSortableTable, ariaSort } from '../../hooks/useSortableTable.js';
import styles from './Usuarios.module.css';

const PAGE_SIZE = 20;

export function FrentesPage() {
  const navigate = useNavigate();
  const [frentes, setFrentes] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [page, setPage] = useState(1);
  const [nuevo, setNuevo] = useState({ nombre: '', proyecto_id: '', etapa: '' });

  function cargar() {
    setCargando(true);
    listFrentes()
      .then((res) => setFrentes(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar();
    listProyectos().then((res) => setProyectos(res.data)).catch(() => {});
  }, []);

  async function handleCrear(e) {
    e.preventDefault();
    setError(null);
    try {
      await createFrente({ nombre: nuevo.nombre, proyecto_id: Number(nuevo.proyecto_id), etapa: nuevo.etapa ? Number(nuevo.etapa) : null });
      setNuevo({ nombre: '', proyecto_id: '', etapa: '' });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return frentes.filter((f) => (!q || f.nombre.toLowerCase().includes(q)) && (!filtroProyecto || String(f.proyecto_id) === filtroProyecto));
  }, [frentes, busqueda, filtroProyecto]);

  const valueGetters = useMemo(
    () => ({
      nombre: (f) => f.nombre,
      proyecto: (f) => f.proyecto?.nombre ?? '',
      etapa: (f) => (f.etapa == null ? null : Number(f.etapa)),
      personas: (f) => f.usuarioIds?.length ?? 0,
    }),
    []
  );
  const { sortedRows, sort, toggleSort } = useSortableTable(filtrados, valueGetters);
  const pagina = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hayFiltros = busqueda !== '' || filtroProyecto !== '';
  const tarjetas = [
    { valor: frentes.length, label: 'Frentes' },
    { valor: new Set(frentes.map((f) => f.proyecto_id)).size, label: 'Proyectos con frentes' },
    { valor: frentes.filter((f) => (f.usuarioIds?.length ?? 0) === 0).length, label: 'Sin personas asignadas' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.listHeader}>
        <div>
          <h1 className={styles.title}>Frentes</h1>
          <p className={styles.subtitle}>Un frente agrupa a las personas de una obra y define quién aprueba cada paso de sus solicitudes.</p>
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

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      <div className={styles.filters}>
        <label className={`${styles.filterField} ${styles.filterSearch}`}>
          <span>Buscar</span>
          <input
            type="text"
            className={styles.control}
            placeholder="Nombre del frente..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPage(1);
            }}
            aria-label="Buscar frentes"
          />
        </label>
        <label className={styles.filterField}>
          <span>Proyecto</span>
          <select
            className={styles.control}
            value={filtroProyecto}
            onChange={(e) => {
              setFiltroProyecto(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {proyectos.map((pr) => (
              <option key={pr.id} value={pr.id}>
                {pr.nombre}
              </option>
            ))}
          </select>
        </label>
        {hayFiltros && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => {
              setBusqueda('');
              setFiltroProyecto('');
              setPage(1);
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort(sort, 'nombre')}>
                <SortHeader label="Frente" sortKey="nombre" sort={sort} onSort={toggleSort} />
              </th>
              <th aria-sort={ariaSort(sort, 'proyecto')}>
                <SortHeader label="Proyecto" sortKey="proyecto" sort={sort} onSort={toggleSort} />
              </th>
              <th aria-sort={ariaSort(sort, 'etapa')}>
                <SortHeader label="Etapa" sortKey="etapa" sort={sort} onSort={toggleSort} />
              </th>
              <th aria-sort={ariaSort(sort, 'personas')}>
                <SortHeader label="Personas" sortKey="personas" sort={sort} onSort={toggleSort} />
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
            ) : pagina.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyState}>
                  Sin frentes que coincidan.
                </td>
              </tr>
            ) : (
              pagina.map((f) => (
                <tr key={f.id} className={styles.clickableRow} onClick={() => navigate(`/configuracion/frentes/${f.id}`)}>
                  <td>
                    <span className={styles.personaNombre}>{f.nombre}</span>
                  </td>
                  <td>{f.proyecto?.nombre}</td>
                  <td>{f.etapa ?? <span className={styles.muted}>—</span>}</td>
                  <td>{f.usuarioIds?.length ? f.usuarioIds.length : <span className={styles.muted}>0</span>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!cargando && <Pagination page={page} pageSize={PAGE_SIZE} total={filtrados.length} onPageChange={setPage} />}
      </div>

      <form className={styles.sectionCard} onSubmit={handleCrear}>
        <div>
          <h2 className={styles.sectionTitle}>Nuevo frente</h2>
          <p className={styles.sectionHint}>Después de crearlo, abre el frente para asignar personas y aprobadores.</p>
        </div>
        <div className={styles.row}>
          <Field className="fieldMd" label="Nombre" required>
            {(p) => <TextInput {...p} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />}
          </Field>
          <Field className="fieldMd" label="Proyecto" required>
            {(p) => (
              <Select {...p} value={nuevo.proyecto_id} onChange={(e) => setNuevo({ ...nuevo, proyecto_id: e.target.value })} required>
                <option value="">Selecciona...</option>
                {proyectos.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field className="fieldMd" label="Etapa">
            {(p) => <TextInput {...p} type="number" value={nuevo.etapa} onChange={(e) => setNuevo({ ...nuevo, etapa: e.target.value })} />}
          </Field>
        </div>
        <div className={styles.actions}>
          <span />
          <Button type="submit" variant="primary">
            Crear frente
          </Button>
        </div>
      </form>
    </div>
  );
}
