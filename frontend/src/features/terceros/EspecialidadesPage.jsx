// Puerto de (app)/terceros/especialidades/page.tsx. El import masivo del
// original parseaba un Excel en el navegador -- acá se reemplaza por un
// textarea de "una especialidad por línea", mismo endpoint backend
// (POST /especialidades/import), sin necesitar una librería de Excel en el
// frontend para un feature tan chico.
import { useEffect, useMemo, useState } from 'react';
import { listEspecialidades, createEspecialidad, updateEspecialidad, removeEspecialidad, importarEspecialidades } from '../../api/especialidades.js';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput, Textarea } from '../../components/ui/Field.jsx';
import { EditIconButton } from '../../components/ui/RowIconButtons.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { useSortableTable, ariaSort } from '../../hooks/useSortableTable.js';
import styles from './Terceros.module.css';

export function EspecialidadesPage() {
  const [especialidades, setEspecialidades] = useState([]);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [nuevo, setNuevo] = useState({ nombre: '', descripcion: '' });
  const [importando, setImportando] = useState(false);
  const [textoImportar, setTextoImportar] = useState('');

  function cargar() {
    listEspecialidades().then((res) => setEspecialidades(res.data)).catch((err) => setError(err.message));
  }

  useEffect(cargar, []);

  const valueGetters = useMemo(() => ({ nombre: (e) => e.nombre, descripcion: (e) => e.descripcion ?? '' }), []);
  const { sortedRows, sort, toggleSort } = useSortableTable(especialidades, valueGetters);

  async function handleCrear(e) {
    e.preventDefault();
    setError(null);
    try {
      await createEspecialidad({ nombre: nuevo.nombre, descripcion: nuevo.descripcion || null });
      setNuevo({ nombre: '', descripcion: '' });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  function empezarEdicion(e) {
    setEditandoId(e.id);
    setForm({ nombre: e.nombre, descripcion: e.descripcion ?? '' });
  }

  async function guardarEdicion(id) {
    setError(null);
    try {
      await updateEspecialidad(id, { nombre: form.nombre, descripcion: form.descripcion || null });
      setEditandoId(null);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminar(e) {
    if (!confirm(`¿Eliminar la especialidad "${e.nombre}"?`)) return;
    setError(null);
    try {
      await removeEspecialidad(e.id);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleImportar(e) {
    e.preventDefault();
    setError(null);
    setImportando(true);
    try {
      const nombres = textoImportar.split('\n').map((n) => n.trim()).filter(Boolean);
      const res = await importarEspecialidades(nombres);
      setMensaje(`Se crearon ${res.data.created}, se omitieron ${res.data.skipped} (ya existían).`);
      setTextoImportar('');
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setImportando(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <BackLink to="/terceros">Terceros</BackLink>
      <h1 className={styles.title}>Especialidades</h1>

      {error && <p className={styles.errorBanner}>{error}</p>}
      {mensaje && <p style={{ fontSize: 'var(--text-data-size)', color: 'var(--color-ink-muted)' }}>{mensaje}</p>}

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort(sort, 'nombre')}><SortHeader label="Nombre" sortKey="nombre" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'descripcion')}><SortHeader label="Descripción" sortKey="descripcion" sort={sort} onSort={toggleSort} /></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((e) => (
              <tr key={e.id}>
                {editandoId === e.id ? (
                  <>
                    <td>
                      <Field label="Nombre">{(p) => <TextInput {...p} value={form.nombre} onChange={(ev) => setForm({ ...form, nombre: ev.target.value })} />}</Field>
                    </td>
                    <td>
                      <Field label="Descripción">{(p) => <TextInput {...p} value={form.descripcion} onChange={(ev) => setForm({ ...form, descripcion: ev.target.value })} />}</Field>
                    </td>
                    <td>
                      <Button type="button" onClick={() => guardarEdicion(e.id)}>Guardar</Button>{' '}
                      <Button type="button" variant="ghost" onClick={() => setEditandoId(null)}>Cancelar</Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{e.nombre}</td>
                    <td>{e.descripcion || '—'}</td>
                    <td>
                      <div className={styles.actionsCell}>
                        <EditIconButton label={`Editar ${e.nombre}`} onClick={() => empezarEdicion(e)} />
                        <Button type="button" variant="danger" onClick={() => eliminar(e)}>Eliminar</Button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {especialidades.length === 0 && (
              <tr>
                <td colSpan={3} className={styles.emptyState}>Sin especialidades todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Nueva especialidad</h2>
        <form style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-end', flexWrap: 'wrap' }} onSubmit={handleCrear}>
          <Field className="fieldMd" label="Nombre" required>
            {(p) => <TextInput {...p} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />}
          </Field>
          <Field className="fieldMd" label="Descripción">
            {(p) => <TextInput {...p} value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} />}
          </Field>
          <Button type="submit">Crear</Button>
        </form>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Importar varias</h2>
        <p style={{ margin: 0, fontSize: 'var(--text-data-size)', color: 'var(--color-ink-muted)' }}>Una especialidad por línea. Las que ya existan se omiten.</p>
        <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }} onSubmit={handleImportar}>
          <Field label="Nombres">
            {(p) => <Textarea {...p} rows={5} value={textoImportar} onChange={(e) => setTextoImportar(e.target.value)} placeholder={'Estructuras\nAcabados\nPlomería'} />}
          </Field>
          <div>
            <Button type="submit" disabled={importando || !textoImportar.trim()}>{importando ? 'Importando…' : 'Importar'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
