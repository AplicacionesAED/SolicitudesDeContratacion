// Crear rol con el diseno del HRMS y Cartera (migracion de diseno 2026-10-09): tarjetas por seccion (Datos del
// rol / Permisos por modulo) y barra de acciones. El arbol de permisos es compartido (ModuloPermisos.jsx).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Select, TextInput } from '../../components/ui/Field.jsx';
import { createRol, listFuncionalidadesDisponibles } from '../../api/roles.js';
import { ALCANCE_SOLICITUDES_LABELS } from '../../utils/permisos.js';
import { ModuloPermisos } from './ModuloPermisos.jsx';
import styles from './Roles.module.css';

export function RolFormPage() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [permisos, setPermisos] = useState([]);
  const [alcance, setAlcance] = useState('FRENTE');
  const [funcionalidades, setFuncionalidades] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    listFuncionalidadesDisponibles()
      .then((res) => setFuncionalidades(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      await createRol({ nombre: nombre.trim(), permisos, alcance_solicitudes: alcance });
      navigate('/configuracion/roles');
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.details?.fieldErrors ?? {});
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.loadingState}>Cargando...</div>;

  return (
    <div className={styles.page}>
      <BackLink to="/configuracion/roles">Roles</BackLink>
      <div>
        <h1 className={styles.title}>Crear rol</h1>
        <p className={styles.subtitle}>Define un conjunto de pantallas y el alcance de solicitudes para asignarlo a las cuentas.</p>
      </div>

      {error && (
        <div className={styles.formError} role="alert">
          {error}
        </div>
      )}

      <form className={styles.formStack} onSubmit={handleSubmit}>
        <section className={styles.sectionCard}>
          <div>
            <h2 className={styles.sectionTitle}>Datos del rol</h2>
            <p className={styles.sectionHint}>Cómo se mostrará en la lista de roles y al asignarlo a una cuenta.</p>
          </div>
          <div className={styles.row}>
            <Field className={styles.fieldMd} label="Nombre del rol" required error={fieldErrors.nombre?.[0]}>
              {(fp) => <TextInput {...fp} value={nombre} onChange={(e) => setNombre(e.target.value)} />}
            </Field>
            <Field className={styles.fieldMd} label="Solicitudes que ve" helper="Dentro de una sección de Solicitudes a la que ya tiene acceso, cuáles filas puede ver.">
              {(fp) => (
                <Select {...fp} value={alcance} onChange={(e) => setAlcance(e.target.value)}>
                  {Object.entries(ALCANCE_SOLICITUDES_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </section>

        <section className={styles.sectionCard}>
          <div>
            <h2 className={styles.sectionTitle}>Permisos por módulo</h2>
            <p className={styles.sectionHint}>Marca las pantallas a las que podrán entrar las cuentas con este rol.</p>
          </div>
          <ModuloPermisos value={permisos} onChange={setPermisos} funcionalidades={funcionalidades} />
        </section>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={() => navigate('/configuracion/roles')}>
            Cancelar
          </Button>
          <div className={styles.actionsEnd}>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear rol'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
