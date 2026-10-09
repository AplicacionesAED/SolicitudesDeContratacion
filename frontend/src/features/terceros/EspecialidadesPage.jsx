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
import { Modal } from '../../components/ui/Modal.jsx';
import styles from '../configuracion/Usuarios.module.css';
import extra from './Terceros.module.css';

export function EspecialidadesPage() {
  const [especialidades, setEspecialidades] = useState([]);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [nuevo, setNuevo] = useState({ nombre: '', descripcion: '' });
  const [importando, setImportando] = useState(false);
  const [textoImportar, setTextoImportar] = useState('');
  const [aEliminar, setAEliminar] = useState(null);

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

  async function eliminar() {
    const e = aEliminar;
    setAEliminar(null);
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
    <div className={styles.page}>
      <BackLink to="/terceros">Terceros</BackLink>
      <div className={styles.listHeader}>
        <div>
          <h1 className={styles.title}>Especialidades</h1>
          <p className={styles.subtitle}>Catálogo de especialidades que se asignan a los terceros (hasta 3 por tercero).</p>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}
      {mensaje && (
        <div className={extra.okBanner} role="status">
          {mensaje}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort(sort, 'nombre')}>
                <SortHeader label="Nombre" sortKey="nombre" sort={sort} onSort={toggleSort} />
              </th>
              <th aria-sort={ariaSort(sort, 'descripcion')}>
                <SortHeader label="Descripción" sortKey="descripcion" sort={sort} onSort={toggleSort} />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((e) =>
              editandoId === e.id ? (
                <tr key={e.id}>
                  <td>
                    <Field label="Nombre">{(p) => <TextInput {...p} value={form.nombre} onChange={(ev) => setForm({ ...form, nombre: ev.target.value })} />}</Field>
                  </td>
                  <td>
                    <Field label="Descripción">{(p) => <TextInput {...p} value={form.descripcion} onChange={(ev) => setForm({ ...form, descripcion: ev.target.value })} />}</Field>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <Button type="button" variant="primary" onClick={() => guardarEdicion(e.id)}>
                        Guardar
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setEditandoId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={e.id}>
                  <td>
                    <span className={styles.personaNombre}>{e.nombre}</span>
                  </td>
                  <td>{e.descripcion || <span className={styles.muted}>—</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <EditIconButton label={`Editar ${e.nombre}`} onClick={() => empezarEdicion(e)} />
                      <Button type="button" variant="ghost" onClick={() => setAEliminar(e)}>
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            )}
            {especialidades.length === 0 && (
              <tr>
                <td colSpan={3} className={styles.emptyState}>
                  Sin especialidades todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form className={styles.sectionCard} onSubmit={handleCrear}>
        <div>
          <h2 className={styles.sectionTitle}>Nueva especialidad</h2>
        </div>
        <div className={styles.row}>
          <Field className="fieldMd" label="Nombre" required>
            {(p) => <TextInput {...p} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />}
          </Field>
          <Field className="fieldMd" label="Descripción">
            {(p) => <TextInput {...p} value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} />}
          </Field>
        </div>
        <div className={styles.actions}>
          <span />
          <Button type="submit" variant="primary">
            Crear
          </Button>
        </div>
      </form>

      <form className={styles.sectionCard} onSubmit={handleImportar}>
        <div>
          <h2 className={styles.sectionTitle}>Importar varias</h2>
          <p className={styles.sectionHint}>Una especialidad por línea. Las que ya existan se omiten.</p>
        </div>
        <Field label="Nombres">
          {(p) => <Textarea {...p} rows={5} value={textoImportar} onChange={(e) => setTextoImportar(e.target.value)} placeholder={'Estructuras\nAcabados\nPlomería'} />}
        </Field>
        <div className={styles.actions}>
          <span />
          <Button type="submit" variant="primary" disabled={importando || !textoImportar.trim()}>
            {importando ? 'Importando...' : 'Importar'}
          </Button>
        </div>
      </form>

      <Modal
        open={!!aEliminar}
        onClose={() => setAEliminar(null)}
        title="Eliminar especialidad"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAEliminar(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={eliminar}>
              Eliminar
            </Button>
          </>
        }
      >
        <p>
          Se eliminará la especialidad <strong>{aEliminar?.nombre}</strong>.
        </p>
      </Modal>
    </div>
  );
}
