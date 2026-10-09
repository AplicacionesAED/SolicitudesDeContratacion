// Detalle de una acción del motor de aprobación, PARA UNA CATEGORÍA
// (`/configuracion/workflows/:categoriaSlug/:accion` -- ver
// WorkflowDiagramaPage.jsx): sus desvíos condicionales (0 o más filas --
// rol + categoría -> estado alternativo, ej. el desvío a
// PENDIENTE_DIRECTOR_TECNICO). Edición inline por fila, mismo patrón que
// ProyectosPage.jsx. La secuencia de estados en sí (estadosOrigen/
// estadoDestino normal) no se edita acá -- eso sigue fijo en
// backend/src/modules/solicitud/solicitud.estado.js, a propósito, y es la
// MISMA para las dos categorías (un solo motor compartido).
//
// 2026-09-02 "separar los workflows de Directas/Indirectas": esta pantalla
// vivía en `/configuracion/workflows/:accion` sola, mezclando los desvíos
// de las dos categorías en una sola tabla con una columna "Categoría". Ahora
// la ruta lleva la categoría (`:categoriaSlug`), así que solo se listan/
// crean desvíos para ESA categoría -- un desvío con `condicion_categoria:
// null` (aplica a las dos) también aparece acá, pero ya no se puede crear
// un desvío para la OTRA categoría por error desde esta pantalla: el
// selector de categoría se acota a "Cualquiera" o la categoría actual.
//
// 2026-09-02 "eliminar permisos de rol para solicitudes": esta pantalla
// tenía además un editor de "permiso requerido" (WorkflowPaso) -- se retiró
// junto con el módulo entero, ninguna acción de aprobación se gatea ya por
// un permiso de rol (ver solicitud.autorizacion.js, resuelto 100% contra
// AprobadorFrente en /configuracion/frentes).
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listDesvios, createDesvio, updateDesvio, removeDesvio } from '../../api/workflows.js';
import { listRoles } from '../../api/roles.js';
import { ACCION_NOMBRES_CORTOS, ESTADO_LABELS, CATEGORIA_LABELS, categoriaFromSlug } from '../../utils/solicitudes.js';
import { ROL_LABELS } from '../../utils/permisos.js';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Select } from '../../components/ui/Field.jsx';
import { Checkbox } from '../../components/ui/Checkbox.jsx';
import { EditIconButton } from '../../components/ui/RowIconButtons.jsx';
import styles from './Configuracion.module.css';

const SLUGS_VALIDOS = ['directas', 'indirectas'];

const ESTADO_OPCIONES = Object.entries(ESTADO_LABELS).map(([value, label]) => ({ value, label }));

const DESVIO_VACIO = { condicion_rol: '', condicion_categoria: '', estado_destino: '', activo: true };

export function WorkflowDetallePage() {
  const { categoriaSlug, accion } = useParams();
  const navigate = useNavigate();
  const categoria = categoriaFromSlug(categoriaSlug);

  const [desvios, setDesvios] = useState(null);
  // Lista real de roles (GET /roles), no el mapa fijo ROL_LABELS -- un rol
  // creado desde RolesPage.jsx no aparecía como condición de desvío
  // posible. Se carga una sola vez, independiente de categoriaSlug/accion.
  const [rolOpciones, setRolOpciones] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(DESVIO_VACIO);
  // Nueva fila: por defecto queda para ESTA categoría (el caso más común
  // entrando desde esta pantalla) -- "Cualquiera" sigue disponible en el
  // selector para el caso real de un desvío compartido entre las dos.
  const [nuevo, setNuevo] = useState({ ...DESVIO_VACIO, condicion_categoria: categoria });
  const [mostrarNuevo, setMostrarNuevo] = useState(false);

  const [error, setError] = useState(null);

  function cargar() {
    // Las 2 categorías y las 11 acciones son fijas -- si la URL no matchea
    // ninguna, no hay nada que mostrar acá.
    if (!SLUGS_VALIDOS.includes(categoriaSlug)) {
      navigate('/configuracion/workflows');
      return;
    }
    if (!ACCION_NOMBRES_CORTOS[accion]) {
      navigate(`/configuracion/workflows/${categoriaSlug}`);
      return;
    }
    listDesvios(accion)
      .then((res) => setDesvios(res.data.filter((d) => !d.condicion_categoria || d.condicion_categoria === categoria)))
      .catch((err) => setError(err.message));
  }

  useEffect(cargar, [categoriaSlug, accion]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    listRoles().then((res) => setRolOpciones(res.data.map((rol) => ({ value: rol.nombre, label: ROL_LABELS[rol.nombre] ?? rol.nombre }))));
  }, []);

  if (error) return <p className={styles.errorBanner}>{error}</p>;
  if (!desvios) return null;

  function empezarEdicion(d) {
    setEditandoId(d.id);
    setForm({ condicion_rol: d.condicion_rol ?? '', condicion_categoria: d.condicion_categoria ?? '', estado_destino: d.estado_destino, activo: d.activo });
  }

  async function guardarDesvio(id) {
    setError(null);
    try {
      await updateDesvio(id, { condicion_rol: form.condicion_rol || null, condicion_categoria: form.condicion_categoria || null, estado_destino: form.estado_destino, activo: form.activo });
      setEditandoId(null);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminarDesvio(id) {
    setError(null);
    try {
      await removeDesvio(id);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function agregarDesvio(e) {
    e.preventDefault();
    if (!nuevo.estado_destino) {
      setError('Selecciona el estado destino del nuevo desvío.');
      return;
    }
    setError(null);
    try {
      await createDesvio({ accion, condicion_rol: nuevo.condicion_rol || null, condicion_categoria: nuevo.condicion_categoria || null, estado_destino: nuevo.estado_destino, activo: nuevo.activo });
      setNuevo({ ...DESVIO_VACIO, condicion_categoria: categoria });
      setMostrarNuevo(false);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!SLUGS_VALIDOS.includes(categoriaSlug)) return null;

  // Acotado a "Cualquiera" o la categoría de esta pantalla -- crear/editar
  // un desvío para la OTRA categoría se hace desde SU propia pantalla, no
  // desde acá (evita el error de dejar un desvío en la categoría
  // equivocada sin querer).
  const categoriaOpciones = [
    { value: '', label: 'Cualquiera (aplica a las dos categorías)' },
    { value: categoria, label: CATEGORIA_LABELS[categoria] },
  ];

  return (
    <>
      <BackLink to={`/configuracion/workflows/${categoriaSlug}`}>Workflow — Solicitudes {CATEGORIA_LABELS[categoria]}s</BackLink>
      <div className={styles.header}>
        <h1 className={styles.title}>{ACCION_NOMBRES_CORTOS[accion] ?? accion}</h1>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.card} style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <strong style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-title-size)' }}>Desvíos condicionales</strong>
        <p style={{ margin: 0, color: 'var(--color-ink-muted)', fontSize: 'var(--text-data-size)' }}>
          Si se cumplen las condiciones marcadas, la solicitud pasa al estado destino en vez del normal. Dejar "Cualquiera" en rol/categoría significa que esa condición no aplica.
        </p>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Rol del solicitante</th>
              <th>Categoría</th>
              <th>Estado destino</th>
              <th>Activo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {desvios.map((d) => (
              <tr key={d.id}>
                {editandoId === d.id ? (
                  <>
                    <td>
                      <Select value={form.condicion_rol} onChange={(e) => setForm({ ...form, condicion_rol: e.target.value })}>
                        <option value="">Cualquiera</option>
                        {rolOpciones.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    </td>
                    <td>
                      <Select value={form.condicion_categoria} onChange={(e) => setForm({ ...form, condicion_categoria: e.target.value })}>
                        {categoriaOpciones.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    </td>
                    <td>
                      <Select value={form.estado_destino} onChange={(e) => setForm({ ...form, estado_destino: e.target.value })}>
                        <option value="">Selecciona...</option>
                        {ESTADO_OPCIONES.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    </td>
                    <td>
                      <Checkbox checked={form.activo} onChange={() => setForm({ ...form, activo: !form.activo })} />
                    </td>
                    <td>
                      <Button type="button" onClick={() => guardarDesvio(d.id)}>Guardar</Button>{' '}
                      <Button type="button" variant="ghost" onClick={() => setEditandoId(null)}>Cancelar</Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{d.condicion_rol ? ROL_LABELS[d.condicion_rol] ?? d.condicion_rol : 'Cualquiera'}</td>
                    <td>{d.condicion_categoria ? CATEGORIA_LABELS[d.condicion_categoria] ?? d.condicion_categoria : 'Cualquiera'}</td>
                    <td>{ESTADO_LABELS[d.estado_destino] ?? d.estado_destino}</td>
                    <td>{d.activo ? 'Sí' : 'No'}</td>
                    <td>
                      <div className={styles.actionsCell}>
                        <EditIconButton label={`Editar desvío${d.condicion_rol ? ` de ${ROL_LABELS[d.condicion_rol] ?? d.condicion_rol}` : ''}`} onClick={() => empezarEdicion(d)} />
                        <Button type="button" variant="ghost" onClick={() => eliminarDesvio(d.id)}>Eliminar</Button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {desvios.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.emptyState}>Sin desvíos configurados para esta categoría -- esta acción siempre va al estado normal.</td>
              </tr>
            )}
          </tbody>
        </table>

        {mostrarNuevo ? (
          <form className={styles.row} onSubmit={agregarDesvio} style={{ alignItems: 'flex-end' }}>
            <Field className="fieldMd" label="Rol del solicitante">
              {(p) => (
                <Select {...p} value={nuevo.condicion_rol} onChange={(e) => setNuevo({ ...nuevo, condicion_rol: e.target.value })}>
                  <option value="">Cualquiera</option>
                  {rolOpciones.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field className="fieldSm" label="Categoría">
              {(p) => (
                <Select {...p} value={nuevo.condicion_categoria} onChange={(e) => setNuevo({ ...nuevo, condicion_categoria: e.target.value })}>
                  {categoriaOpciones.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field className="fieldMd" label="Estado destino" required>
              {(p) => (
                <Select {...p} value={nuevo.estado_destino} onChange={(e) => setNuevo({ ...nuevo, estado_destino: e.target.value })} required>
                  <option value="">Selecciona...</option>
                  {ESTADO_OPCIONES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Button type="submit">Agregar desvío</Button>
            <Button type="button" variant="ghost" onClick={() => { setMostrarNuevo(false); setNuevo({ ...DESVIO_VACIO, condicion_categoria: categoria }); }}>Cancelar</Button>
          </form>
        ) : (
          <div>
            <Button type="button" variant="secondary" onClick={() => setMostrarNuevo(true)}>Agregar desvío</Button>
          </div>
        )}
      </div>
    </>
  );
}
