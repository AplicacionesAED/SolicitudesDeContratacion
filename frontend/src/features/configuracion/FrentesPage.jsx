// Lista de frentes + creación inline (nombre/proyecto/etapa, 3 campos). La
// gestión de usuarios asignados y AprobadorFrente (más compleja, arrays de
// IDs) vive en FrenteDetallePage.jsx -- fila clickeable navega ahí.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listFrentes, createFrente } from '../../api/frentes.js';
import { listProyectos } from '../../api/proyectos.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput, Select } from '../../components/ui/Field.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { useSortableTable, ariaSort } from '../../hooks/useSortableTable.js';
import styles from './Configuracion.module.css';

export function FrentesPage() {
  const navigate = useNavigate();
  const [frentes, setFrentes] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [error, setError] = useState(null);
  const [nuevo, setNuevo] = useState({ nombre: '', proyecto_id: '', etapa: '' });

  function cargar() {
    listFrentes().then((res) => setFrentes(res.data)).catch((err) => setError(err.message));
  }

  useEffect(() => {
    cargar();
    listProyectos().then((res) => setProyectos(res.data));
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

  const valueGetters = useMemo(() => ({ nombre: (f) => f.nombre, proyecto: (f) => f.proyecto?.nombre ?? '', etapa: (f) => (f.etapa == null ? null : Number(f.etapa)) }), []);
  const { sortedRows, sort, toggleSort } = useSortableTable(frentes, valueGetters);

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Frentes</h1>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort(sort, 'nombre')}><SortHeader label="Nombre" sortKey="nombre" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'proyecto')}><SortHeader label="Proyecto" sortKey="proyecto" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'etapa')}><SortHeader label="Etapa" sortKey="etapa" sort={sort} onSort={toggleSort} /></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((f) => (
              <tr key={f.id} onClick={() => navigate(`/configuracion/frentes/${f.id}`)} style={{ cursor: 'pointer' }}>
                <td>{f.nombre}</td>
                <td>{f.proyecto?.nombre}</td>
                <td>{f.etapa ?? '—'}</td>
              </tr>
            ))}
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={3} className={styles.emptyState}>Sin frentes todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.card} style={{ padding: 'var(--space-lg)' }}>
        <form className={styles.row} onSubmit={handleCrear}>
          <Field className="fieldMd" label="Nuevo frente" required>
            {(p) => <TextInput {...p} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />}
          </Field>
          <Field className="fieldMd" label="Proyecto" required>
            {(p) => (
              <Select {...p} value={nuevo.proyecto_id} onChange={(e) => setNuevo({ ...nuevo, proyecto_id: e.target.value })} required>
                <option value="">Selecciona...</option>
                {proyectos.map((pr) => (
                  <option key={pr.id} value={pr.id}>{pr.nombre}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field className="fieldSm" label="Etapa">
            {(p) => <TextInput {...p} type="number" value={nuevo.etapa} onChange={(e) => setNuevo({ ...nuevo, etapa: e.target.value })} />}
          </Field>
          <Button type="submit">Crear frente</Button>
        </form>
      </div>
    </>
  );
}
