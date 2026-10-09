// Proyectos con el diseno del HRMS y Cartera (migracion de diseno 2026-10-09): tarjetas de resumen, tabla con edicion
// inline por fila (3 campos caben en una fila) y una tarjeta para crear. Sin delete fisico: se activa / desactiva.
import { useEffect, useMemo, useState } from 'react';
import { createProyecto, listProyectos, updateProyecto } from '../../api/proyectos.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { EditIconButton, ToggleActivoIconButton } from '../../components/ui/RowIconButtons.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { useSortableTable, ariaSort } from '../../hooks/useSortableTable.js';
import styles from './Usuarios.module.css';
import extra from './Estructura.module.css';

const estadoBadge = (activo) =>
  activo ? (
    <Badge variant="success" dot>
      Activo
    </Badge>
  ) : (
    <Badge variant="neutral" dot>
      Inactivo
    </Badge>
  );

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
    setError(null);
    try {
      await updateProyecto(p.id, { activo: !p.activo });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  const tarjetas = [
    { valor: proyectos.length, label: 'Proyectos' },
    { valor: proyectos.filter((p) => p.activo).length, label: 'Activos' },
    { valor: proyectos.filter((p) => !p.activo).length, label: 'Inactivos' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.listHeader}>
        <div>
          <h1 className={styles.title}>Proyectos</h1>
          <p className={styles.subtitle}>Proyectos de obra. El código consecutivo es el prefijo de los consecutivos de sus solicitudes.</p>
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

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort(sort, 'nombre')}>
                <SortHeader label="Nombre" sortKey="nombre" sort={sort} onSort={toggleSort} />
              </th>
              <th aria-sort={ariaSort(sort, 'codigo_consecutivo')}>
                <SortHeader label="Código consecutivo" sortKey="codigo_consecutivo" sort={sort} onSort={toggleSort} />
              </th>
              <th aria-sort={ariaSort(sort, 'activo')}>
                <SortHeader label="Estado" sortKey="activo" sort={sort} onSort={toggleSort} />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={4} className={styles.emptyState}>
                  Cargando...
                </td>
              </tr>
            ) : sortedRows.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyState}>
                  Sin proyectos todavía.
                </td>
              </tr>
            ) : (
              sortedRows.map((p) =>
                editandoId === p.id ? (
                  <tr key={p.id}>
                    <td>
                      <Field label="Nombre">{(fp) => <TextInput {...fp} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />}</Field>
                    </td>
                    <td>
                      <Field label="Código">{(fp) => <TextInput {...fp} value={form.codigo_consecutivo} onChange={(e) => setForm({ ...form, codigo_consecutivo: e.target.value })} />}</Field>
                    </td>
                    <td>{estadoBadge(p.activo)}</td>
                    <td>
                      <div className={extra.inlineEdit}>
                        <Button type="button" variant="primary" onClick={() => guardarEdicion(p.id)}>
                          Guardar
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setEditandoId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    <td>
                      <span className={styles.personaNombre}>{p.nombre}</span>
                    </td>
                    <td>{p.codigo_consecutivo ?? <span className={styles.muted}>—</span>}</td>
                    <td>{estadoBadge(p.activo)}</td>
                    <td>
                      <div className={extra.actionsCell}>
                        <EditIconButton label={`Editar ${p.nombre}`} onClick={() => empezarEdicion(p)} />
                        <ToggleActivoIconButton activo={p.activo} labelActivar={`Activar ${p.nombre}`} labelInactivar={`Desactivar ${p.nombre}`} onClick={() => toggleActivo(p)} />
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

      <form className={styles.sectionCard} onSubmit={handleCrear}>
        <div>
          <h2 className={styles.sectionTitle}>Nuevo proyecto</h2>
          <p className={styles.sectionHint}>El código consecutivo es opcional (ej. BAI).</p>
        </div>
        <div className={styles.row}>
          <Field className="fieldMd" label="Nombre" required>
            {(p) => <TextInput {...p} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />}
          </Field>
          <Field className="fieldMd" label="Código consecutivo">
            {(p) => <TextInput {...p} value={nuevo.codigo_consecutivo} onChange={(e) => setNuevo({ ...nuevo, codigo_consecutivo: e.target.value })} />}
          </Field>
        </div>
        <div className={styles.actions}>
          <span />
          <Button type="submit" variant="primary">
            Crear proyecto
          </Button>
        </div>
      </form>
    </div>
  );
}
