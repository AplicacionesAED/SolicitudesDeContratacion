// Puerto de (app)/terceros/nuevo/page.tsx. `especialidadIds` es un array
// (0..N) -- la restricción de "máximo 3" que tiene la selección desde el
// detalle (ver TerceroDetallePage) no aplica acá, la app original tampoco la
// tenía en el form de creación.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTercero } from '../../api/terceros.js';
import { listEspecialidades } from '../../api/especialidades.js';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput, Select } from '../../components/ui/Field.jsx';
import styles from './Terceros.module.css';

const TIPO_CONTRATO_OPTIONS = [
  { value: 'OBRA', label: 'Otros Servicios' },
  { value: 'DISENO', label: 'Diseño' },
  { value: 'SERVICIOS', label: 'Servicios' },
];

const NIT_REGEX = /^\d{6,10}-\d$/;

const VACIO = {
  razonSocial: '',
  nit: '',
  representanteLegal: '',
  cedulaRepresentante: '',
  correoFirma: '',
  direccionRepresentante: '',
  telefonoRepresentante: '',
  nombreContacto: '',
  telefonoContacto: '',
  correoContacto: '',
  tipoContrato: '',
};

export function NuevoTerceroPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [especialidadIds, setEspecialidadIds] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    listEspecialidades().then((res) => setCatalogo(res.data));
  }, []);

  function handleChange(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => {
      if (!prev[campo]) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });
  }

  function toggleEspecialidad(id) {
    setEspecialidadIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function validar() {
    const nuevos = {};
    if (!form.razonSocial.trim()) nuevos.razonSocial = 'La razón social es obligatoria';
    if (!form.nit.trim()) nuevos.nit = 'El NIT es obligatorio';
    else if (!NIT_REGEX.test(form.nit.trim())) nuevos.nit = 'Formato inválido. Use XXXXXXXXX-X (ej. 900123456-7)';
    if (!form.representanteLegal.trim()) nuevos.representanteLegal = 'El representante legal es obligatorio';
    if (!form.cedulaRepresentante.trim()) nuevos.cedulaRepresentante = 'La cédula del RL es obligatoria';
    if (!form.correoFirma.trim()) nuevos.correoFirma = 'El correo de firma es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correoFirma)) nuevos.correoFirma = 'Correo electrónico inválido';
    if (!form.direccionRepresentante.trim()) nuevos.direccionRepresentante = 'La dirección es obligatoria';
    if (!form.telefonoRepresentante.trim()) nuevos.telefonoRepresentante = 'El teléfono es obligatorio';
    if (!form.tipoContrato) nuevos.tipoContrato = 'Selecciona el tipo de contrato';
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!validar()) return;
    setGuardando(true);
    try {
      const res = await createTercero({
        ...form,
        nombreContacto: form.nombreContacto || undefined,
        telefonoContacto: form.telefonoContacto || undefined,
        correoContacto: form.correoContacto || undefined,
        especialidadIds,
      });
      navigate(`/terceros/${res.data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <BackLink to="/terceros">Terceros</BackLink>
      <h1 className={styles.title}>Nuevo tercero</h1>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Datos del tercero</h2>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <Field className="fieldMd" label="Razón Social" required error={errores.razonSocial}>
              {(p) => <TextInput {...p} value={form.razonSocial} onChange={(e) => handleChange('razonSocial', e.target.value)} />}
            </Field>
            <Field className="fieldMd" label="NIT" required error={errores.nit} helper="Formato: 900123456-7">
              {(p) => <TextInput {...p} value={form.nit} onChange={(e) => handleChange('nit', e.target.value)} />}
            </Field>
          </div>
          <Field className="fieldMd" label="Tipo de Contrato" required error={errores.tipoContrato}>
            {(p) => (
              <Select {...p} value={form.tipoContrato} onChange={(e) => handleChange('tipoContrato', e.target.value)}>
                <option value="">Selecciona un tipo</option>
                {TIPO_CONTRATO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Representante legal</h2>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <Field className="fieldMd" label="Nombre del Representante Legal" required error={errores.representanteLegal}>
              {(p) => <TextInput {...p} value={form.representanteLegal} onChange={(e) => handleChange('representanteLegal', e.target.value)} />}
            </Field>
            <Field className="fieldMd" label="Cédula del RL" required error={errores.cedulaRepresentante}>
              {(p) => <TextInput {...p} value={form.cedulaRepresentante} onChange={(e) => handleChange('cedulaRepresentante', e.target.value)} />}
            </Field>
          </div>
          <Field label="Correo para Firma" required error={errores.correoFirma}>
            {(p) => <TextInput {...p} type="email" value={form.correoFirma} onChange={(e) => handleChange('correoFirma', e.target.value)} />}
          </Field>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <Field className="fieldMd" label="Dirección del RL" required error={errores.direccionRepresentante}>
              {(p) => <TextInput {...p} value={form.direccionRepresentante} onChange={(e) => handleChange('direccionRepresentante', e.target.value)} />}
            </Field>
            <Field className="fieldMd" label="Teléfono del RL" required error={errores.telefonoRepresentante}>
              {(p) => <TextInput {...p} value={form.telefonoRepresentante} onChange={(e) => handleChange('telefonoRepresentante', e.target.value)} />}
            </Field>
          </div>
        </div>

        <div className={styles.section}>
          <div>
            <h2 className={styles.sectionTitle}>Contacto comercial</h2>
            <p style={{ margin: '2px 0 0', fontSize: 'var(--text-data-size)', color: 'var(--color-ink-muted)' }}>Información opcional de contacto.</p>
          </div>
          <Field label="Nombre del Contacto">
            {(p) => <TextInput {...p} value={form.nombreContacto} onChange={(e) => handleChange('nombreContacto', e.target.value)} />}
          </Field>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <Field className="fieldMd" label="Teléfono del Contacto">
              {(p) => <TextInput {...p} value={form.telefonoContacto} onChange={(e) => handleChange('telefonoContacto', e.target.value)} />}
            </Field>
            <Field className="fieldMd" label="Correo del Contacto">
              {(p) => <TextInput {...p} type="email" value={form.correoContacto} onChange={(e) => handleChange('correoContacto', e.target.value)} />}
            </Field>
          </div>
        </div>

        {catalogo.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Especialidades</h2>
            <p style={{ margin: 0, fontSize: 'var(--text-data-size)', color: 'var(--color-ink-muted)' }}>Selecciona las que apliquen (opcional).</p>
            <div className={styles.chips} style={{ flexWrap: 'wrap' }}>
              {catalogo.map((e) => (
                <label key={e.id} className={styles.chip} style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={especialidadIds.includes(e.id)} onChange={() => toggleEspecialidad(e.id)} />
                  {e.nombre}
                </label>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
          <Button type="button" variant="secondary" onClick={() => navigate('/terceros')} disabled={guardando}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar tercero'}</Button>
        </div>
      </form>
    </div>
  );
}
