// Puerto de (app)/terceros/[id]/page.tsx + una sección nueva que la app
// original no tenía en UI (los 6 checkboxes de debida diligencia solo
// existían en la API, nunca en una pantalla -- ver el comentario en
// tercero.model.js). Tres secciones editables por separado, cada una con su
// propio botón Guardar (no un solo botón Editar global -- son bloques
// independientes con permisos distintos: contacto es de cualquier
// autenticado, DD y especialidades exigen permisos concretos).
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { getTercero, updateTercero } from '../../api/terceros.js';
import { listEspecialidades } from '../../api/especialidades.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { usuarioTienePermiso } from '../../utils/permisos.js';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { Checkbox } from '../../components/ui/Checkbox.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { SolicitudBadge } from '../solicitudes/SolicitudBadge.jsx';
import { TIPO_SOLICITUD_LABELS, CATEGORIA_LABELS, formatCurrency } from '../../utils/solicitudes.js';
import layoutStyles from '../../components/layout/WizardLayout.module.css';
import { iniciales } from '../configuracion/usuarioUtils.js';
import styles from '../configuracion/Usuarios.module.css';
import extra from './Terceros.module.css';

const TIPO_CONTRATO_LABEL = { OBRA: 'Otros Servicios', DISENO: 'Diseño', SERVICIOS: 'Servicios' };

const DD_CHECKS = [
  ['dd_identificacionContraparte', 'Identificación de la contraparte'],
  ['dd_consultaListasRestrictivas', 'Consulta en listas restrictivas'],
  ['dd_verificacionPep', 'Verificación PEP'],
  ['dd_conocimientoNegocio', 'Conocimiento del negocio'],
  ['dd_monitoreoActualizacion', 'Monitoreo y actualización'],
  ['dd_senalesAlertaReporte', 'Señales de alerta / reporte'],
];

// Datos que el documento de la solicitud necesita del tercero (los mismos 6 que cuenta el Directorio).
const DATOS_REQUERIDOS = [
  ['nit', 'NIT'],
  ['representanteLegal', 'Representante legal'],
  ['cedulaRepresentante', 'Cédula del representante'],
  ['correoFirma', 'Correo de firma'],
  ['direccionRepresentante', 'Dirección'],
  ['telefonoRepresentante', 'Teléfono'],
];

const CONTACT_FIELDS = ['nit', 'representanteLegal', 'cedulaRepresentante', 'correoFirma', 'direccionRepresentante', 'telefonoRepresentante', 'nombreContacto', 'telefonoContacto', 'correoContacto'];

export function TerceroDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const puedeEditar = usuarioTienePermiso(usuario, 'editar_terceros');

  const [tercero, setTercero] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [error, setError] = useState(null);

  const [editandoContacto, setEditandoContacto] = useState(false);
  const [contactoForm, setContactoForm] = useState({});
  const [editandoDd, setEditandoDd] = useState(false);
  const [ddForm, setDdForm] = useState({});
  const [editandoEsp, setEditandoEsp] = useState(false);
  const [espIds, setEspIds] = useState([]);
  const [guardando, setGuardando] = useState(null);

  function cargar() {
    getTercero(id)
      .then((res) => {
        setTercero(res.data);
        setContactoForm(res.data);
        setDdForm(res.data);
        setEspIds(res.data.especialidades.map((e) => e.id));
      })
      .catch((err) => {
        if (err.status === 404) navigate('/terceros');
        else setError(err.message);
      });
  }

  useEffect(cargar, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    listEspecialidades().then((res) => setCatalogo(res.data));
  }, []);

  async function guardarContacto(e) {
    e.preventDefault();
    setGuardando('contacto');
    setError(null);
    try {
      const payload = Object.fromEntries(CONTACT_FIELDS.map((f) => [f, contactoForm[f] || null]));
      await updateTercero(id, payload);
      setEditandoContacto(false);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(null);
    }
  }

  async function guardarDd() {
    setGuardando('dd');
    setError(null);
    try {
      const payload = Object.fromEntries(DD_CHECKS.map(([campo]) => [campo, Boolean(ddForm[campo])]));
      await updateTercero(id, payload);
      setEditandoDd(false);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(null);
    }
  }

  async function guardarEspecialidades() {
    setGuardando('esp');
    setError(null);
    try {
      await updateTercero(id, { especialidadIds: espIds });
      setEditandoEsp(false);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(null);
    }
  }

  if (!tercero) return <div className={styles.loadingState}>Cargando...</div>;

  // ---- Requisitos para poder contratarlo (misma regla que el selector de contratista de SolicitudForm.jsx) ----
  const ddMarcados = DD_CHECKS.filter(([campo]) => tercero[campo]).length;
  const datosFaltantes = DATOS_REQUERIDOS.filter(([campo]) => !tercero[campo] || !String(tercero[campo]).trim());
  const diasVenc = tercero.fechaVencimientoSagrilaft ? Math.ceil((new Date(tercero.fechaVencimientoSagrilaft).getTime() - Date.now()) / 86400000) : null;
  const sagrilaftOk = diasVenc === null || diasVenc > 0;
  const requisitos = [
    {
      ok: tercero.aprobadoDebidaDiligencia,
      titulo: 'Debida diligencia aprobada',
      detalle: tercero.aprobadoDebidaDiligencia
        ? ddMarcados === 0
          ? 'Aprobada desde la sincronización con SharePoint; no hay verificaciones registradas aquí.'
          : `${ddMarcados} de 6 verificaciones registradas.`
        : `Faltan verificaciones (${ddMarcados} de 6 marcadas).`,
      accion: !tercero.aprobadoDebidaDiligencia && puedeEditar ? { label: 'Marcar verificaciones', onClick: () => { setDdForm(tercero); setEditandoDd(true); document.getElementById('seccion-dd')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } : null,
    },
    { ok: tercero.confidencialidad, titulo: 'Acuerdo de confidencialidad', detalle: tercero.confidencialidad ? 'Firmado.' : 'Sin acuerdo de confidencialidad: no aparece como contratista al crear una solicitud.', accion: null },
    {
      ok: sagrilaftOk,
      titulo: 'SAGRILAFT vigente',
      detalle: diasVenc === null ? 'Sin fecha de vencimiento registrada.' : diasVenc <= 0 ? `Venció el ${new Date(tercero.fechaVencimientoSagrilaft).toLocaleDateString('es-CO')}.` : `Vence en ${diasVenc} días (${new Date(tercero.fechaVencimientoSagrilaft).toLocaleDateString('es-CO')}).`,
      aviso: sagrilaftOk && diasVenc !== null && diasVenc <= 30,
      accion: null,
    },
  ];
  const disponible = requisitos.every((r) => r.ok);

  const solicitudes = tercero.solicitudes ?? [];
  const valorTotal = solicitudes.filter((s) => !['ANULADA', 'BORRADOR'].includes(s.estado)).reduce((sum, s) => sum + Number(s.valorFinal ?? 0), 0);
  const enCurso = solicitudes.filter((s) => !['COMPLETADA', 'ANULADA', 'BORRADOR'].includes(s.estado)).length;

  function irACompletarDatos() {
    setContactoForm(tercero);
    setEditandoContacto(true);
    setTimeout(() => document.getElementById('seccion-contacto')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }

  const diasSagrilaft = tercero.fechaVencimientoSagrilaft ? Math.ceil((new Date(tercero.fechaVencimientoSagrilaft).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className={styles.page}>
      <BackLink to="/terceros">Terceros</BackLink>

      <section className={layoutStyles.hero}>
        <div className={layoutStyles.heroAvatar}>{iniciales(tercero.razonSocial)}</div>
        <div className={layoutStyles.heroInfo}>
          <h1 className={layoutStyles.heroName}>{tercero.razonSocial}</h1>
          <p className={layoutStyles.heroRole}>NIT {tercero.nit || '—'}</p>
          <p className={layoutStyles.heroMeta}>
            {TIPO_CONTRATO_LABEL[tercero.tipoContrato] ?? tercero.tipoContrato}
            {tercero.fechaVencimientoSagrilaft && ` · SAGRILAFT vence el ${new Date(tercero.fechaVencimientoSagrilaft).toLocaleDateString('es-CO')}${diasSagrilaft !== null ? (diasSagrilaft <= 0 ? ' (vencido)' : ` (${diasSagrilaft} días)`) : ''}`}
          </p>
        </div>
        <div className={layoutStyles.heroSide}>
          {tercero.aprobadoDebidaDiligencia ? (
            <Badge variant="success" dot>
              Debida diligencia aprobada
            </Badge>
          ) : (
            <Badge variant="neutral" dot>
              Debida diligencia pendiente
            </Badge>
          )}
          {tercero.confidencialidad && <Badge variant="info">Confidencialidad</Badge>}
        </div>
      </section>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      <div className={styles.formStack}>
        <section className={styles.sectionCard}>
          <div className={extra.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Para contratar</h2>
              <p className={styles.sectionHint}>{disponible ? 'Cumple los requisitos: aparece como contratista al crear una solicitud.' : 'Todavía no aparece como contratista al crear una solicitud.'}</p>
            </div>
            {disponible ? <Badge variant="success" dot>Disponible</Badge> : <Badge variant="neutral" dot>No disponible</Badge>}
          </div>
          <ul className={extra.requisitos}>
            {requisitos.map((r) => (
              <li key={r.titulo} className={extra.requisito}>
                {r.ok ? <CheckCircle2 size={20} className={r.aviso ? extra.reqAviso : extra.reqOk} aria-hidden="true" /> : <CircleAlert size={20} className={extra.reqFalta} aria-hidden="true" />}
                <div>
                  <p className={extra.reqTitulo}>{r.titulo}</p>
                  <p className={extra.reqDetalle}>{r.detalle}</p>
                </div>
                {r.accion && <Button type="button" variant="secondary" onClick={r.accion.onClick}>{r.accion.label}</Button>}
              </li>
            ))}
            <li className={extra.requisito}>
              {datosFaltantes.length === 0 ? <CheckCircle2 size={20} className={extra.reqOk} aria-hidden="true" /> : <CircleAlert size={20} className={extra.reqAviso} aria-hidden="true" />}
              <div>
                <p className={extra.reqTitulo}>Datos para el documento de la solicitud</p>
                <p className={extra.reqDetalle}>{datosFaltantes.length === 0 ? 'Completos.' : `Faltan: ${datosFaltantes.map(([, l]) => l).join(', ')}.`}</p>
              </div>
              {datosFaltantes.length > 0 && !editandoContacto && <Button type="button" variant="secondary" onClick={irACompletarDatos}>Completar datos</Button>}
            </li>
          </ul>
        </section>

        <div className={styles.kpiRow}>
          <div className={styles.kpiCard}><span className={styles.kpiValor}>{solicitudes.length}</span><span className={styles.kpiLabel}>Solicitudes</span></div>
          <div className={styles.kpiCard}><span className={styles.kpiValor}>{enCurso}</span><span className={styles.kpiLabel}>En curso</span></div>
          <div className={styles.kpiCard}><span className={styles.kpiValor}>{formatCurrency(valorTotal)}</span><span className={styles.kpiLabel}>Valor contratado</span></div>
        </div>

        <section className={styles.sectionCard}>
          <div>
            <h2 className={styles.sectionTitle}>Solicitudes con este tercero</h2>
            <p className={styles.sectionHint}>Solo las que tu rol puede ver.</p>
          </div>
          {solicitudes.length === 0 ? (
            <p className={styles.permisosVacio}>Todavía no hay solicitudes con este tercero.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Solicitud</th><th>Tipo</th><th>Estado</th><th>Valor</th><th>Fecha</th></tr></thead>
                <tbody>
                  {solicitudes.map((s) => (
                    <tr key={s.id} className={styles.clickableRow} onClick={() => navigate(`/solicitudes/${s.id}`)}>
                      <td><Link to={`/solicitudes/${s.id}`} onClick={(e) => e.stopPropagation()} className={extra.reqTitulo}>{s.consecutivo}</Link></td>
                      <td>{TIPO_SOLICITUD_LABELS[s.tipo] ?? s.tipo} · {CATEGORIA_LABELS[s.categoria] ?? s.categoria}</td>
                      <td><SolicitudBadge estado={s.estado} /></td>
                      <td>{s.valorFinal ? formatCurrency(s.valorFinal) : <span className={styles.muted}>—</span>}</td>
                      <td>{new Date(s.fechaSolicitud).toLocaleDateString('es-CO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <form id="seccion-contacto" className={styles.sectionCard} onSubmit={guardarContacto}>
          <div className={extra.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Representante legal y contacto</h2>
              <p className={styles.sectionHint}>Datos que se usan al armar los documentos de la solicitud.</p>
            </div>
            {!editandoContacto && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setContactoForm(tercero);
                  setEditandoContacto(true);
                }}
              >
                Editar
              </Button>
            )}
          </div>

          {editandoContacto ? (
            <>
              <div className={styles.row}>
              <Field className="fieldMd" label="NIT">
                {(p) => <TextInput {...p} value={contactoForm.nit ?? ''} onChange={(e) => setContactoForm({ ...contactoForm, nit: e.target.value })} />}
              </Field>
              <Field className="fieldMd" label="Representante legal">
                {(p) => <TextInput {...p} value={contactoForm.representanteLegal ?? ''} onChange={(e) => setContactoForm({ ...contactoForm, representanteLegal: e.target.value })} />}
              </Field>
              <Field className="fieldMd" label="Cédula del RL">
                {(p) => <TextInput {...p} value={contactoForm.cedulaRepresentante ?? ''} onChange={(e) => setContactoForm({ ...contactoForm, cedulaRepresentante: e.target.value })} />}
              </Field>
              <Field className="fieldMd" label="Correo de firma">
                {(p) => <TextInput {...p} type="email" value={contactoForm.correoFirma ?? ''} onChange={(e) => setContactoForm({ ...contactoForm, correoFirma: e.target.value })} />}
              </Field>
              <Field className="fieldMd" label="Dirección del RL">
                {(p) => <TextInput {...p} value={contactoForm.direccionRepresentante ?? ''} onChange={(e) => setContactoForm({ ...contactoForm, direccionRepresentante: e.target.value })} />}
              </Field>
              <Field className="fieldMd" label="Teléfono del RL">
                {(p) => <TextInput {...p} value={contactoForm.telefonoRepresentante ?? ''} onChange={(e) => setContactoForm({ ...contactoForm, telefonoRepresentante: e.target.value })} />}
              </Field>
              <Field className="fieldMd" label="Nombre de contacto">
                {(p) => <TextInput {...p} value={contactoForm.nombreContacto ?? ''} onChange={(e) => setContactoForm({ ...contactoForm, nombreContacto: e.target.value })} />}
              </Field>
              <Field className="fieldMd" label="Teléfono de contacto">
                {(p) => <TextInput {...p} value={contactoForm.telefonoContacto ?? ''} onChange={(e) => setContactoForm({ ...contactoForm, telefonoContacto: e.target.value })} />}
              </Field>
              <Field className="fieldMd" label="Correo de contacto">
                {(p) => <TextInput {...p} type="email" value={contactoForm.correoContacto ?? ''} onChange={(e) => setContactoForm({ ...contactoForm, correoContacto: e.target.value })} />}
              </Field>
              </div>
              <div className={styles.actions}>
                <Button type="button" variant="secondary" onClick={() => setEditandoContacto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={guardando === 'contacto'}>
                  {guardando === 'contacto' ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </>
          ) : (
            <div className={extra.infoGrid}>
            <div className={extra.infoItem}><span className={extra.infoLabel}>Representante legal</span><span className={extra.infoValue}>{tercero.representanteLegal || <span className={extra.faltaDato}>Falta</span>}</span></div>
            <div className={extra.infoItem}><span className={extra.infoLabel}>Cédula</span><span className={extra.infoValue}>{tercero.cedulaRepresentante || <span className={extra.faltaDato}>Falta</span>}</span></div>
            <div className={extra.infoItem}><span className={extra.infoLabel}>Correo de firma</span><span className={extra.infoValue}>{tercero.correoFirma || <span className={extra.faltaDato}>Falta</span>}</span></div>
            <div className={extra.infoItem}><span className={extra.infoLabel}>Dirección</span><span className={extra.infoValue}>{tercero.direccionRepresentante || <span className={extra.faltaDato}>Falta</span>}</span></div>
            <div className={extra.infoItem}><span className={extra.infoLabel}>Teléfono</span><span className={extra.infoValue}>{tercero.telefonoRepresentante || <span className={extra.faltaDato}>Falta</span>}</span></div>
            <div className={extra.infoItem}><span className={extra.infoLabel}>Contacto</span><span className={extra.infoValue}>{tercero.nombreContacto || '—'}</span></div>
            <div className={extra.infoItem}><span className={extra.infoLabel}>Tel. contacto</span><span className={extra.infoValue}>{tercero.telefonoContacto || '—'}</span></div>
            <div className={extra.infoItem}><span className={extra.infoLabel}>Correo contacto</span><span className={extra.infoValue}>{tercero.correoContacto || '—'}</span></div>
            </div>
          )}
        </form>

        <section id="seccion-dd" className={styles.sectionCard}>
          <div className={extra.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Debida diligencia</h2>
              <p className={styles.sectionHint}>Se aprueba cuando las seis verificaciones están marcadas.</p>
            </div>
            <div className={extra.sectionHeadEnd}>
              {tercero.aprobadoDebidaDiligencia ? (
                <Badge variant="success" dot>
                  Aprobado
                </Badge>
              ) : (
                <Badge variant="neutral" dot>
                  Pendiente
                </Badge>
              )}
              {puedeEditar && !editandoDd && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setDdForm(tercero);
                    setEditandoDd(true);
                  }}
                >
                  Editar
                </Button>
              )}
            </div>
          </div>
          <div className={extra.infoGrid}>
            {DD_CHECKS.map(([campo, label]) => (
              <Checkbox key={campo} label={label} disabled={!editandoDd} checked={Boolean((editandoDd ? ddForm : tercero)[campo])} onChange={(e) => setDdForm({ ...ddForm, [campo]: e.target.checked })} />
            ))}
          </div>
          {editandoDd && (
            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={() => setEditandoDd(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" onClick={guardarDd} disabled={guardando === 'dd'}>
                {guardando === 'dd' ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          )}
        </section>

        <section className={styles.sectionCard}>
          <div className={extra.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Especialidades</h2>
              <p className={styles.sectionHint}>Hasta 3 por tercero.</p>
            </div>
            {!editandoEsp && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEspIds(tercero.especialidades.map((e) => e.id));
                  setEditandoEsp(true);
                }}
              >
                Editar
              </Button>
            )}
          </div>
          {editandoEsp ? (
            <>
              {catalogo.length === 0 ? (
                <p className={styles.permisosVacio}>No hay especialidades en el catálogo. Créalas primero desde Terceros → Especialidades.</p>
              ) : (
                <div className={extra.chips}>
                  {catalogo.map((e) => {
                    const seleccionada = espIds.includes(e.id);
                    const deshabilitada = !seleccionada && espIds.length >= 3;
                    return (
                      <label key={e.id} className={`${extra.chip} ${extra.chipSelectable} ${seleccionada ? extra.chipSelected : ''} ${deshabilitada ? extra.chipDisabled : ''}`}>
                        <input type="checkbox" checked={seleccionada} disabled={deshabilitada} onChange={() => setEspIds((prev) => (seleccionada ? prev.filter((x) => x !== e.id) : [...prev, e.id]))} />
                        {e.nombre}
                      </label>
                    );
                  })}
                </div>
              )}
              {espIds.length >= 3 && <p className={styles.sectionHint}>Máximo 3 especialidades.</p>}
              <div className={styles.actions}>
                <Button type="button" variant="secondary" onClick={() => setEditandoEsp(false)}>
                  Cancelar
                </Button>
                <Button type="button" variant="primary" onClick={guardarEspecialidades} disabled={guardando === 'esp'}>
                  {guardando === 'esp' ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </>
          ) : tercero.especialidades.length === 0 ? (
            <p className={styles.permisosVacio}>Sin especialidades asignadas.</p>
          ) : (
            <div className={extra.chips}>
              {tercero.especialidades.map((e) => (
                <span key={e.id} className={extra.chip}>
                  {e.nombre}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
