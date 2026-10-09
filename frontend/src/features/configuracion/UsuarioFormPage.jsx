// El id especial 'nueva' activa modo creación en el mismo componente (sin
// fetch, campos siempre editables) -- ver "Cuándo SÍ vale una página de
// edición dedicada" en ARQUITECTURA-FRONTEND.md. Edición real: un solo botón
// Guardar en el header, sin distinción Ver/Editar (a diferencia del patrón de
// Vista/Edición de un registro con muchas secciones, este form es chico).
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createUsuario, listUsuarios, updateUsuario } from '../../api/usuarios.js';
import { listRoles, listFuncionalidadesDisponibles } from '../../api/roles.js';
import { ROL_LABELS } from '../../utils/permisos.js';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import { Checkbox } from '../../components/ui/Checkbox.jsx';
import { CheckboxGroup } from '../../components/ui/CheckboxGroup.jsx';
import styles from './Configuracion.module.css';

const VACIO = { nombre: '', email: '', password: '', roles: [], funcionalidades_adicionales: [], cargo: '', telefono: '', activo: true };

export function UsuarioFormPage() {
  const { id } = useParams();
  const esNuevo = id === 'nueva';
  const navigate = useNavigate();
  const [form, setForm] = useState(VACIO);
  // Lista de roles REAL (tabla `roles`, GET /roles) -- antes era un array
  // fijo de los 9 roles sembrados originalmente; un rol creado desde
  // RolesPage.jsx nunca aparecía acá porque ese array no se volvía a leer
  // de ningún lado. Ver la nota de esta fecha en CLAUDE.md.
  const [roles, setRoles] = useState([]);
  const [funcionalidades, setFuncionalidades] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    listRoles().then((res) => setRoles(res.data));
    listFuncionalidadesDisponibles().then((res) => setFuncionalidades(res.data));
    if (esNuevo) return;
    // No hay GET /usuarios/:id individual expuesto aparte de la lista --
    // reusar la lista es suficiente para este volumen de usuarios.
    listUsuarios().then((res) => {
      const usuario = res.data.find((u) => String(u.id) === id);
      if (usuario) setForm({ ...VACIO, ...usuario, password: '' });
    });
  }, [id, esNuevo]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (form.roles.length === 0) {
      setError('Selecciona al menos un rol');
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        nombre: form.nombre,
        roles: form.roles,
        funcionalidades_adicionales: form.funcionalidades_adicionales,
        cargo: form.cargo || null,
        telefono: form.telefono || null,
      };
      if (esNuevo) {
        await createUsuario({ ...payload, email: form.email, password: form.password });
      } else {
        await updateUsuario(id, { ...payload, activo: form.activo, ...(form.password ? { password: form.password } : {}) });
      }
      navigate('/configuracion/usuarios');
    } catch (err) {
      setError(err.details?.formErrors?.join(', ') ?? err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <BackLink to="/configuracion/usuarios">Usuarios</BackLink>
      <div className={styles.header}>
        <h1 className={styles.title}>{esNuevo ? 'Crear usuario' : form.nombre}</h1>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <form className={styles.card} style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <Field className="fieldMd" label="Nombre" required>
            {(p) => <TextInput {...p} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />}
          </Field>
          <Field className="fieldMd" label="Correo" required>
            {(p) => (
              <TextInput {...p} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!esNuevo} />
            )}
          </Field>
        </div>

        <div className={styles.row}>
          <Field className="fieldSm" label="Cargo">
            {(p) => <TextInput {...p} value={form.cargo ?? ''} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />}
          </Field>
          <Field className="fieldSm" label="Teléfono">
            {(p) => <TextInput {...p} value={form.telefono ?? ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />}
          </Field>
          <Field className="fieldSm" label={esNuevo ? 'Contraseña' : 'Nueva contraseña'} required={esNuevo} helper={esNuevo ? undefined : 'Déjalo vacío para no cambiarla'}>
            {(p) => <TextInput {...p} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={esNuevo} />}
          </Field>
        </div>

        <CheckboxGroup
          label="Roles"
          options={roles.map((rol) => ({ value: rol.nombre, label: ROL_LABELS[rol.nombre] ?? rol.nombre }))}
          value={form.roles}
          onChange={(nuevos) => setForm((prev) => ({ ...prev, roles: nuevos }))}
        />

        <CheckboxGroup
          label="Funcionalidades adicionales"
          hint="Permisos concedidos a mano a este usuario, por encima de los que ya le da su rol."
          options={Object.entries(funcionalidades).map(([slug, info]) => ({ value: slug, label: info.nombre }))}
          value={form.funcionalidades_adicionales}
          onChange={(nuevos) => setForm((prev) => ({ ...prev, funcionalidades_adicionales: nuevos }))}
        />

        {!esNuevo && (
          <Checkbox label="Activo" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
        )}

        <div>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </>
  );
}
