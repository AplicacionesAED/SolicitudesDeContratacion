// CRUD de catálogo simple (nombre/codigo_consecutivo/activo) -- edición
// inline por fila, sin página dedicada (3 campos, cabe en una fila de tabla).
import { useEffect, useMemo, useState } from 'react';
import { createProyecto, listProyectos, updateProyecto } from '../../api/proyectos.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { EditIconButton, ToggleActivoIconButton } from '../../components/ui/RowIconButtons.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { useSortableTable, ariaSort } from '../../hooks/useSortableTable.js';
import styles from './Configuracion.module.css';

export function ProyectosPage() {
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ nombre: '', codigo_consecutivo: '' });
  const [nuevo, setNuevo] = useState({ nombre: '', codigo_consecutivo: '' });

  function cargar() {
    setCargando(true);
    listProyectos()
      .then((res) => setProyectos(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }

  useEffect(cargar, []);

  const valueGetters = useMemo(
    () => ({
      nombre: (p) => p.nombre,
      codigo_consecutivo: (p) => p.codigo_consecutivo ?? '',
      activo: (p) => (p.activo ? 1 : 0),
    }),
    []
  );
  const { sortedRows, sort, toggleSort } = useSortableTable(proyectos, valueGetters);

  async function handleCrear(e) {
    e.preventDefault();
    setError(null);
    try {
      await createProyecto({ nombre: nuevo.nombre, codigo_consecutivo: nuevo.codigo_consecutivo || null });
      setNuevo({ nombre: '', codigo_consecutivo: '' });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  function empezarEdicion(p) {
    setEditandoId(p.id);
    setForm({ nombre: p.nombre, codigo_consecutivo: p.codigo_consecutivo ?? '' });
  }

  async function guardarEdicion(id) {
    setError(null);
    try {
      await updateProyecto(id, { nombre: form.nombre, codigo_consecutivo: form.codigo_consecutivo || null });
      setEditandoId(null);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActivo(p) {
    await updateProyecto(p.id, { activo: !p.activo });
    cargar();
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Proyectos</h1>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort(sort, 'nombre')}><SortHeader label="Nombre" sortKey="nombre" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'codigo_consecutivo')}><SortHeader label="Código consecutivo" sortKey="codigo_consecutivo" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'activo')}><SortHeader label="Estado" sortKey="activo" sort={sort} onSort={toggleSort} /></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((p) => (
              <tr key={p.id}>
                {editandoId === p.id ? (
                  <>
                    <td>
                      <Field label="Nombre">
                        {(fp) => <TextInput {...fp} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />}
                      </Field>
                    </td>
                    <td>
                      <Field label="Código">
                        {(fp) => (
                          <TextInput {...fp} value={form.codigo_consecutivo} onChange={(e) => setForm({ ...form, codigo_consecutivo: e.target.value })} />
                        )}
                      </Field>
                    </td>
                    <td>{p.activo ? <Badge variant="success" dot>Activo</Badge> : <Badge variant="neutral" dot>Inactivo</Badge>}</td>
                    <td>
                      <Button type="button" onClick={() => guardarEdicion(p.id)}>Guardar</Button>{' '}
                      <Button type="button" variant="ghost" onClick={() => setEditandoId(null)}>Cancelar</Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{p.nombre}</td>
                    <td>{p.codigo_consecutivo ?? '—'}</td>
                    <td>{p.activo ? <Badge variant="success" dot>Activo</Badge> : <Badge variant="neutral" dot>Inactivo</Badge>}</td>
                    <td>
                      <div className={styles.actionsCell}>
                        <EditIconButton label={`Editar ${p.nombre}`} onClick={() => empezarEdicion(p)} />
                        <ToggleActivoIconButton
                          activo={p.activo}
                          labelActivar={`Activar ${p.nombre}`}
                          labelInactivar={`Desactivar ${p.nombre}`}
                          onClick={() => toggleActivo(p)}
                        />
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {!cargando && proyectos.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.emptyState}>Sin proyectos todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.card} style={{ padding: 'var(--space-lg)' }}>
        <form className={styles.row} onSubmit={handleCrear}>
          <Field className="fieldMd" label="Nuevo proyecto" required>
            {(p) => <TextInput {...p} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />}
          </Field>
          <Field className="fieldSm" label="Código consecutivo" helper="ej. BAI">
            {(p) => <TextInput {...p} value={nuevo.codigo_consecutivo} onChange={(e) => setNuevo({ ...nuevo, codigo_consecutivo: e.target.value })} />}
          </Field>
          <Button type="submit">Crear proyecto</Button>
        </form>
      </div>
    </>
  );
}
