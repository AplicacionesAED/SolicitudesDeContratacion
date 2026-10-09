// Especialidades (rediseno 2026-10-09). Antes era un CRUD plano; ahora muestra el USO real del catalogo:
//  - cuantos terceros tiene cada especialidad (y cuales), cuales no se usan nunca (candidatas a limpiar),
//  - posibles duplicadas ("Estructura" / "Estructuras") con un boton para FUSIONARLAS moviendo a sus terceros,
//  - y no deja borrar una que esta en uso (los terceros la perderian en silencio): se fusiona o se libera antes.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listEspecialidades, createEspecialidad, updateEspecialidad, removeEspecialidad, importarEspecialidades, listTercerosDeEspecialidad, fusionarEspecialidad } from '../../api/especialidades.js';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput, Select, Textarea } from '../../components/ui/Field.jsx';
import { EditIconButton } from '../../components/ui/RowIconButtons.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { useSortableTable, ariaSort } from '../../hooks/useSortableTable.js';
import styles from '../configuracion/Usuarios.module.css';
import extra from './Terceros.module.css';

const PAGE_SIZE = 20;

// Clave para detectar nombres casi iguales: sin tildes, sin signos, en minuscula y sin plural final.
function claveNombre(nombre) {
  const base = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return base.replace(/(es|s)$/, '');
}

export function EspecialidadesPage() {
  const [especialidades, setEspecialidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroUso, setFiltroUso] = useState('');
  const [page, setPage] = useState(1);

  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [nuevo, setNuevo] = useState({ nombre: '', descripcion: '' });
  const [importarAbierto, setImportarAbierto] = useState(false);
  const [textoImportar, setTextoImportar] = useState('');
  const [importando, setImportando] = useState(false);

  const [verTerceros, setVerTerceros] = useState(null); // { especialidad, terceros }
  const [aFusionar, setAFusionar] = useState(null); // { origen, destinoId }
  const [aEliminar, setAEliminar] = useState(null);
  const [procesando, setProcesando] = useState(false);

  function cargar() {
    setCargando(true);
    listEspecialidades()
      .then((res) => setEspecialidades(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }
  useEffect(cargar, []);

  const maxUso = Math.max(1, ...especialidades.map((e) => e.total_terceros ?? 0));

  const duplicadas = useMemo(() => {
    const grupos = new Map();
    for (const e of especialidades) {
      const k = claveNombre(e.nombre);
      if (!k) continue;
      grupos.set(k, [...(grupos.get(k) ?? []), e]);
    }
    return [...grupos.values()].filter((g) => g.length > 1);
  }, [especialidades]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return especialidades.filter((e) => {
      if (q && !(e.nombre.toLowerCase().includes(q) || (e.descripcion ?? '').toLowerCase().includes(q))) return false;
      if (filtroUso === 'uso' && !(e.total_terceros > 0)) return false;
      if (filtroUso === 'sin-uso' && e.total_terceros > 0) return false;
      return true;
    });
  }, [especialidades, busqueda, filtroUso]);

  const valueGetters = useMemo(() => ({ nombre: (e) => e.nombre, terceros: (e) => e.total_terceros ?? 0 }), []);
  const { sortedRows, sort, toggleSort } = useSortableTable(filtradas, valueGetters);
  const pagina = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function accion(fn, textoOk) {
    setProcesando(true);
    setError(null);
    try {
      await fn();
      if (textoOk) setMensaje(textoOk);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function handleCrear(e) {
    e.preventDefault();
    await accion(async () => {
      await createEspecialidad({ nombre: nuevo.nombre, descripcion: nuevo.descripcion || null });
      setNuevo({ nombre: '', descripcion: '' });
    }, null);
  }

  async function guardarEdicion(id) {
    await accion(async () => {
      await updateEspecialidad(id, { nombre: form.nombre, descripcion: form.descripcion || null });
      setEditandoId(null);
    }, null);
  }

  async function abrirTerceros(especialidad) {
    setError(null);
    try {
      const res = await listTercerosDeEspecialidad(especialidad.id);
      setVerTerceros({ especialidad, terceros: res.data });
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmarFusion() {
    const { origen, destinoId } = aFusionar;
    setAFusionar(null);
    await accion(() => fusionarEspecialidad(origen.id, Number(destinoId)), `"${origen.nombre}" se fusionó y sus terceros pasaron a la especialidad elegida.`);
  }

  async function confirmarEliminar() {
    const e = aEliminar;
    setAEliminar(null);
    await accion(() => removeEspecialidad(e.id), `Se eliminó "${e.nombre}".`);
  }

  async function handleImportar(e) {
    e.preventDefault();
    setImportando(true);
    setError(null);
    try {
      const nombres = textoImportar.split('\n').map((n) => n.trim()).filter(Boolean);
      const res = await importarEspecialidades(nombres);
      setMensaje(`Se crearon ${res.data.created}, se omitieron ${res.data.skipped} (ya existían).`);
      setTextoImportar('');
      setImportarAbierto(false);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setImportando(false);
    }
  }

  const enUso = especialidades.filter((e) => e.total_terceros > 0).length;
  const tarjetas = [
    { valor: especialidades.length, label: 'Especialidades' },
    { valor: enUso, label: 'En uso por algún tercero' },
    { valor: especialidades.length - enUso, label: 'Sin usar (candidatas a limpiar)' },
    { valor: duplicadas.length, label: 'Grupos con nombres parecidos' },
  ];
  const opcionesDestino = (origen) => especialidades.filter((e) => e.id !== origen?.id);

  return (
    <div className={styles.page}>
      <BackLink to="/terceros">Terceros</BackLink>
      <div className={styles.listHeader}>
        <div>
          <h1 className={styles.title}>Especialidades</h1>
          <p className={styles.subtitle}>Catálogo con el que se clasifica a los terceros. Mira cuáles se usan, unifica nombres repetidos y limpia las que sobran.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setImportarAbierto(true)}>
          Importar varias
        </Button>
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

      {error && <div className={styles.errorBanner} role="alert">{error}</div>}
      {mensaje && <div className={extra.okBanner} role="status">{mensaje}</div>}

      {duplicadas.length > 0 && (
        <div className={extra.dupBanner} role="status">
          <p className={extra.dupTitle}>Posibles duplicadas: conviene unificarlas</p>
          {duplicadas.slice(0, 4).map((grupo) => {
            const [principal, ...resto] = [...grupo].sort((a, b) => (b.total_terceros ?? 0) - (a.total_terceros ?? 0));
            return (
              <div key={principal.id} className={extra.dupRow}>
                <span>
                  {grupo.map((e) => `${e.nombre} (${e.total_terceros ?? 0})`).join('  ·  ')}
                </span>
                <Button type="button" variant="secondary" onClick={() => setAFusionar({ origen: resto[0], destinoId: String(principal.id) })}>
                  Fusionar en «{principal.nombre}»
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <form className={styles.sectionCard} onSubmit={handleCrear}>
        <div className={extra.agregar}>
          <Field className="fieldMd" label="Nueva especialidad" required>
            {(p) => <TextInput {...p} placeholder="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />}
          </Field>
          <Field className="fieldMd" label="Descripción (opcional)">
            {(p) => <TextInput {...p} value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} />}
          </Field>
          <Button type="submit" variant="primary" disabled={procesando || !nuevo.nombre.trim()}>
            Agregar
          </Button>
        </div>
      </form>

      <div className={styles.filters}>
        <label className={`${styles.filterField} ${styles.filterSearch}`}>
          <span>Buscar</span>
          <input type="text" className={styles.control} placeholder="Nombre o descripción..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPage(1); }} aria-label="Buscar especialidades" />
        </label>
        <label className={styles.filterField}>
          <span>Uso</span>
          <select className={styles.control} value={filtroUso} onChange={(e) => { setFiltroUso(e.target.value); setPage(1); }}>
            <option value="">Todas</option>
            <option value="uso">En uso</option>
            <option value="sin-uso">Sin usar</option>
          </select>
        </label>
        {(busqueda || filtroUso) && (
          <button type="button" className={styles.clearBtn} onClick={() => { setBusqueda(''); setFiltroUso(''); setPage(1); }}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort(sort, 'nombre')}><SortHeader label="Especialidad" sortKey="nombre" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'terceros')}><SortHeader label="Terceros que la tienen" sortKey="terceros" sort={sort} onSort={toggleSort} /></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={3} className={styles.emptyState}>Cargando...</td></tr>
            ) : pagina.length === 0 ? (
              <tr><td colSpan={3} className={styles.emptyState}>Sin especialidades que coincidan.</td></tr>
            ) : (
              pagina.map((e) =>
                editandoId === e.id ? (
                  <tr key={e.id}>
                    <td>
                      <div className={extra.agregar}>
                        <Field className="fieldMd" label="Nombre">{(p) => <TextInput {...p} value={form.nombre} onChange={(ev) => setForm({ ...form, nombre: ev.target.value })} />}</Field>
                        <Field className="fieldMd" label="Descripción">{(p) => <TextInput {...p} value={form.descripcion} onChange={(ev) => setForm({ ...form, descripcion: ev.target.value })} />}</Field>
                      </div>
                    </td>
                    <td />
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                        <Button type="button" variant="primary" onClick={() => guardarEdicion(e.id)} disabled={procesando}>Guardar</Button>
                        <Button type="button" variant="secondary" onClick={() => setEditandoId(null)}>Cancelar</Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={e.id}>
                    <td>
                      <div className={styles.personaTexto}>
                        <span className={styles.personaNombre}>{e.nombre}</span>
                        {e.descripcion && <span className={styles.personaDoc}>{e.descripcion}</span>}
                      </div>
                    </td>
                    <td>
                      {e.total_terceros > 0 ? (
                        <div className={extra.usoCell}>
                          <button type="button" className={`${extra.usoNum} ${extra.usoLink}`} onClick={() => abrirTerceros(e)} title="Ver los terceros">{e.total_terceros}</button>
                          <div className={extra.usoBar} aria-hidden="true"><div className={extra.usoFill} style={{ width: `${Math.round((e.total_terceros / maxUso) * 100)}%` }} /></div>
                        </div>
                      ) : (
                        <span className={styles.muted}>Sin usar</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <EditIconButton label={`Editar ${e.nombre}`} onClick={() => { setEditandoId(e.id); setForm({ nombre: e.nombre, descripcion: e.descripcion ?? '' }); }} />
                        <Button type="button" variant="ghost" onClick={() => setAFusionar({ origen: e, destinoId: '' })}>Fusionar</Button>
                        <Button type="button" variant="ghost" disabled={e.total_terceros > 0} title={e.total_terceros > 0 ? 'Está en uso: fusiónala con otra primero' : undefined} onClick={() => setAEliminar(e)}>Eliminar</Button>
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
        {!cargando && <Pagination page={page} pageSize={PAGE_SIZE} total={sortedRows.length} onPageChange={setPage} />}
      </div>

      <Modal open={!!verTerceros} onClose={() => setVerTerceros(null)} title={verTerceros ? `Terceros con «${verTerceros.especialidad.nombre}»` : ''} footer={<Button variant="secondary" onClick={() => setVerTerceros(null)}>Cerrar</Button>}>
        {verTerceros && (
          <ul className={extra.listaTerceros}>
            {verTerceros.terceros.map((t) => (
              <li key={t.id}>
                <Link to={`/terceros/${t.id}`}><span>{t.razonSocial}</span><span className={styles.muted}>{t.nit}</span></Link>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        open={!!aFusionar}
        onClose={() => setAFusionar(null)}
        title="Fusionar especialidad"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAFusionar(null)}>Cancelar</Button>
            <Button variant="primary" onClick={confirmarFusion} disabled={!aFusionar?.destinoId || procesando}>Fusionar</Button>
          </>
        }
      >
        {aFusionar && (
          <>
            <p>
              Los terceros que tienen <strong>{aFusionar.origen.nombre}</strong> ({aFusionar.origen.total_terceros ?? 0}) pasarán a la especialidad que elijas y <strong>{aFusionar.origen.nombre}</strong> se eliminará. No se puede deshacer.
            </p>
            <Field label="Fusionar en" required>
              {(p) => (
                <Select {...p} value={aFusionar.destinoId} onChange={(ev) => setAFusionar({ ...aFusionar, destinoId: ev.target.value })}>
                  <option value="">Selecciona...</option>
                  {opcionesDestino(aFusionar.origen).map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre} ({e.total_terceros ?? 0})</option>
                  ))}
                </Select>
              )}
            </Field>
          </>
        )}
      </Modal>

      <Modal open={!!aEliminar} onClose={() => setAEliminar(null)} title="Eliminar especialidad" footer={<><Button variant="secondary" onClick={() => setAEliminar(null)}>Cancelar</Button><Button variant="danger" onClick={confirmarEliminar}>Eliminar</Button></>}>
        <p>Se eliminará la especialidad <strong>{aEliminar?.nombre}</strong>. Ningún tercero la tiene asignada.</p>
      </Modal>

      <Modal
        open={importarAbierto}
        onClose={() => setImportarAbierto(false)}
        title="Importar varias especialidades"
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportarAbierto(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleImportar} disabled={importando || !textoImportar.trim()}>{importando ? 'Importando...' : 'Importar'}</Button>
          </>
        }
      >
        <p>Una especialidad por línea. Las que ya existan se omiten.</p>
        <Field label="Nombres">
          {(p) => <Textarea {...p} rows={6} value={textoImportar} onChange={(e) => setTextoImportar(e.target.value)} placeholder={'Estructuras\nAcabados\nPlomería'} />}
        </Field>
      </Modal>
    </div>
  );
}
