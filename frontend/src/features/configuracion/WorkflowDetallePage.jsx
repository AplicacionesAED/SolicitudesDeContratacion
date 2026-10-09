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
import { Badge } from '../../components/ui/Badge.jsx';
import { EditIconButton } from '../../components/ui/RowIconButtons.jsx';
import styles from './Usuarios.module.css';
import extra from './Estructura.module.css';

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

  if (!desvios) return error ? <div className={styles.errorBanner} role="alert">{error}</div> : null;

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

  const selectDesvio = (value, onChange, children) => (
    <Select value={value} onChange={onChange}>
      {children}
    </Select>
  );

  return (
    <div className={styles.page}>
      <BackLink to={`/configuracion/workflows/${categoriaSlug}`}>Workflow — Solicitudes {CATEGORIA_LABELS[categoria]}s</BackLink>
      <div>
        <h1 className={styles.title}>{ACCION_NOMBRES_CORTOS[accion] ?? accion}</h1>
        <p className={styles.subtitle}>
          Desvíos condicionales de esta acción para Solicitudes {CATEGORIA_LABELS[categoria]}s. Si se cumplen las condiciones, la solicitud pasa al estado destino en vez del normal.
        </p>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      <section className={styles.sectionCard}>
        <div>
          <h2 className={styles.sectionTitle}>Desvíos condicionales</h2>
          <p className={styles.sectionHint}>"Cualquiera" en rol o categoría significa que esa condición no aplica.</p>
        </div>

        <div className={styles.tableWrap}>
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
              {desvios.map((d) =>
                editandoId === d.id ? (
                  <tr key={d.id}>
                    <td>
                      {selectDesvio(form.condicion_rol, (e) => setForm({ ...form, condicion_rol: e.target.value }), (
                        <>
                          <option value="">Cualquiera</option>
                          {rolOpciones.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </>
                      ))}
                    </td>
                    <td>
                      {selectDesvio(form.condicion_categoria, (e) => setForm({ ...form, condicion_categoria: e.target.value }), (
                        <>
                          {categoriaOpciones.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </>
                      ))}
                    </td>
                    <td>
                      {selectDesvio(form.estado_destino, (e) => setForm({ ...form, estado_destino: e.target.value }), (
                        <>
                          <option value="">Selecciona...</option>
                          {ESTADO_OPCIONES.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </>
                      ))}
                    </td>
                    <td>
                      <Checkbox checked={form.activo} onChange={() => setForm({ ...form, activo: !form.activo })} />
                    </td>
                    <td>
                      <div className={extra.inlineEdit}>
                        <Button type="button" variant="primary" onClick={() => guardarDesvio(d.id)}>
                          Guardar
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setEditandoId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={d.id}>
                    <td>{d.condicion_rol ? ROL_LABELS[d.condicion_rol] ?? d.condicion_rol : <span className={styles.muted}>Cualquiera</span>}</td>
                    <td>{d.condicion_categoria ? CATEGORIA_LABELS[d.condicion_categoria] ?? d.condicion_categoria : <span className={styles.muted}>Cualquiera</span>}</td>
                    <td>{ESTADO_LABELS[d.estado_destino] ?? d.estado_destino}</td>
                    <td>
                      {d.activo ? (
                        <Badge variant="success" dot>
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="neutral" dot>
                          Inactivo
                        </Badge>
                      )}
                    </td>
                    <td>
                      <div className={extra.actionsCell}>
                        <EditIconButton label={`Editar desvío${d.condicion_rol ? ` de ${ROL_LABELS[d.condicion_rol] ?? d.condicion_rol}` : ''}`} onClick={() => empezarEdicion(d)} />
                        <Button type="button" variant="ghost" onClick={() => eliminarDesvio(d.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {desvios.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    Sin desvíos configurados para esta categoría: esta acción siempre va al estado normal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {mostrarNuevo ? (
          <form className={styles.formStack} onSubmit={agregarDesvio}>
            <div className={styles.row}>
              <Field className="fieldMd" label="Rol del solicitante">
                {(p) => (
                  <Select {...p} value={nuevo.condicion_rol} onChange={(e) => setNuevo({ ...nuevo, condicion_rol: e.target.value })}>
                    <option value="">Cualquiera</option>
                    {rolOpciones.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field className="fieldMd" label="Categoría">
                {(p) => (
                  <Select {...p} value={nuevo.condicion_categoria} onChange={(e) => setNuevo({ ...nuevo, condicion_categoria: e.target.value })}>
                    {categoriaOpciones.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field className="fieldMd" label="Estado destino" required>
                {(p) => (
                  <Select {...p} value={nuevo.estado_destino} onChange={(e) => setNuevo({ ...nuevo, estado_destino: e.target.value })} required>
                    <option value="">Selecciona...</option>
                    {ESTADO_OPCIONES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <div className={styles.actions}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setMostrarNuevo(false);
                  setNuevo({ ...DESVIO_VACIO, condicion_categoria: categoria });
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Agregar desvío
              </Button>
            </div>
          </form>
        ) : (
          <div className={styles.actions}>
            <span />
            <Button type="button" variant="secondary" onClick={() => setMostrarNuevo(true)}>
              Agregar desvío
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
