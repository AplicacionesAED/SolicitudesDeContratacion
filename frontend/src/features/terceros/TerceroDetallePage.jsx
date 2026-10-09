// Puerto de (app)/terceros/[id]/page.tsx + una sección nueva que la app
// original no tenía en UI (los 6 checkboxes de debida diligencia solo
// existían en la API, nunca en una pantalla -- ver el comentario en
// tercero.model.js). Tres secciones editables por separado, cada una con su
// propio botón Guardar (no un solo botón Editar global -- son bloques
// independientes con permisos distintos: contacto es de cualquier
// autenticado, DD y especialidades exigen permisos concretos).
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTercero, updateTercero } from '../../api/terceros.js';
import { listEspecialidades } from '../../api/especialidades.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { usuarioTienePermiso } from '../../utils/permisos.js';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import styles from './Terceros.module.css';

const TIPO_CONTRATO_LABEL = { OBRA: 'Otros Servicios', DISENO: 'Diseño', SERVICIOS: 'Servicios' };

const DD_CHECKS = [
  ['dd_identificacionContraparte', 'Identificación de la contraparte'],
  ['dd_consultaListasRestrictivas', 'Consulta en listas restrictivas'],
  ['dd_verificacionPep', 'Verificación PEP'],
  ['dd_conocimientoNegocio', 'Conocimiento del negocio'],
  ['dd_monitoreoActualizacion', 'Monitoreo y actualización'],
  ['dd_senalesAlertaReporte', 'Señales de alerta / reporte'],
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

  if (!tercero) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <BackLink to="/terceros">Terceros</BackLink>
      <div>
        <h1 className={styles.title}>{tercero.razonSocial}</h1>
        <p style={{ margin: '2px 0 0', fontFamily: 'monospace', color: 'var(--color-ink-muted)' }}>{tercero.nit}</p>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.detailCard}>
      <div className={styles.detailSection}>
        <h2 className={styles.sectionTitle}>Datos del tercero</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Tipo de contrato</span>
            <span className={styles.infoValue}>{TIPO_CONTRATO_LABEL[tercero.tipoContrato] ?? tercero.tipoContrato}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Vcto. SAGRILAFT</span>
            <span className={styles.infoValue}>{tercero.fechaVencimientoSagrilaft ? new Date(tercero.fechaVencimientoSagrilaft).toLocaleDateString('es-CO') : '—'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Confidencialidad</span>
            <span className={styles.infoValue}>{tercero.confidencialidad ? <Badge variant="info" dot>Sí</Badge> : <Badge variant="neutral" dot>No</Badge>}</span>
          </div>
        </div>
      </div>

      <form className={styles.detailSection} onSubmit={guardarContacto}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Representante legal y contacto</h2>
          {!editandoContacto && <Button type="button" variant="ghost" onClick={() => { setContactoForm(tercero); setEditandoContacto(true); }}>Editar</Button>}
        </div>

        {editandoContacto ? (
          <>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
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
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <Button type="submit" disabled={guardando === 'contacto'}>{guardando === 'contacto' ? 'Guardando…' : 'Guardar'}</Button>
              <Button type="button" variant="secondary" onClick={() => setEditandoContacto(false)}>Cancelar</Button>
            </div>
          </>
        ) : (
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Representante legal</span><span className={styles.infoValue}>{tercero.representanteLegal || '—'}</span></div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Cédula</span><span className={styles.infoValue}>{tercero.cedulaRepresentante || '—'}</span></div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Correo de firma</span><span className={styles.infoValue}>{tercero.correoFirma || '—'}</span></div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Dirección</span><span className={styles.infoValue}>{tercero.direccionRepresentante || '—'}</span></div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Teléfono</span><span className={styles.infoValue}>{tercero.telefonoRepresentante || '—'}</span></div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Contacto</span><span className={styles.infoValue}>{tercero.nombreContacto || '—'}</span></div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Tel. contacto</span><span className={styles.infoValue}>{tercero.telefonoContacto || '—'}</span></div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Correo contacto</span><span className={styles.infoValue}>{tercero.correoContacto || '—'}</span></div>
          </div>
        )}
      </form>

      <div className={styles.detailSection}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Debida diligencia</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            {tercero.aprobadoDebidaDiligencia ? <Badge variant="success" dot>Aprobado</Badge> : <Badge variant="neutral" dot>Pendiente</Badge>}
            {puedeEditar && !editandoDd && <Button type="button" variant="ghost" onClick={() => { setDdForm(tercero); setEditandoDd(true); }}>Editar</Button>}
          </div>
        </div>
        <div className={styles.infoGrid}>
          {DD_CHECKS.map(([campo, label]) => (
            <label key={campo} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-body-size)' }}>
              <input
                type="checkbox"
                disabled={!editandoDd}
                checked={Boolean((editandoDd ? ddForm : tercero)[campo])}
                onChange={(e) => setDdForm({ ...ddForm, [campo]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
        {editandoDd && (
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button type="button" onClick={guardarDd} disabled={guardando === 'dd'}>{guardando === 'dd' ? 'Guardando…' : 'Guardar'}</Button>
            <Button type="button" variant="secondary" onClick={() => setEditandoDd(false)}>Cancelar</Button>
          </div>
        )}
      </div>

      <div className={styles.detailSection}>
        <div className={styles.header}>
          <h2 className={styles.sectionTitle}>Especialidades</h2>
          {!editandoEsp && <Button type="button" variant="ghost" onClick={() => { setEspIds(tercero.especialidades.map((e) => e.id)); setEditandoEsp(true); }}>Editar</Button>}
        </div>
        {editandoEsp ? (
          <>
            {catalogo.length === 0 ? (
              <p style={{ fontSize: 'var(--text-data-size)', color: 'var(--color-ink-muted)' }}>
                No hay especialidades en el catálogo. Créalas primero desde Terceros → Especialidades.
              </p>
            ) : (
              <div className={styles.chips}>
                {catalogo.map((e) => {
                  const seleccionada = espIds.includes(e.id);
                  const deshabilitada = !seleccionada && espIds.length >= 3;
                  return (
                    <label key={e.id} className={styles.chip} style={{ cursor: deshabilitada ? 'not-allowed' : 'pointer', opacity: deshabilitada ? 0.5 : 1 }}>
                      <input
                        type="checkbox"
                        checked={seleccionada}
                        disabled={deshabilitada}
                        onChange={() => setEspIds((prev) => (seleccionada ? prev.filter((x) => x !== e.id) : [...prev, e.id]))}
                      />
                      {e.nombre}
                    </label>
                  );
                })}
              </div>
            )}
            {espIds.length >= 3 && <p style={{ fontSize: 'var(--text-data-size)', color: '#8a5a00' }}>Máximo 3 especialidades</p>}
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <Button type="button" onClick={guardarEspecialidades} disabled={guardando === 'esp'}>{guardando === 'esp' ? 'Guardando…' : 'Guardar'}</Button>
              <Button type="button" variant="secondary" onClick={() => setEditandoEsp(false)}>Cancelar</Button>
            </div>
          </>
        ) : (
          <div className={styles.chips}>
            {tercero.especialidades.length === 0 ? (
              <p style={{ fontSize: 'var(--text-data-size)', color: 'var(--color-ink-muted)', margin: 0 }}>Sin especialidades asignadas</p>
            ) : (
              tercero.especialidades.map((e) => <span key={e.id} className={styles.chip}>{e.nombre}</span>)
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
