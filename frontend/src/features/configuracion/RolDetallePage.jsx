// Detalle de un rol con el diseno del HRMS y Cartera (migracion de diseno 2026-10-09): banner de detalle, tarjetas
// por seccion y barra de acciones. No hay GET /roles/:nombre -- se busca en memoria sobre listRoles() (son ~10 filas).
// El rol de administrador (es_admin) tiene acceso total: solo se puede renombrar, sus permisos no se editan.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, Select, TextInput } from '../../components/ui/Field.jsx';
import { listRoles, listFuncionalidadesDisponibles, updateRol } from '../../api/roles.js';
import { ROL_LABELS, ALCANCE_SOLICITUDES_LABELS } from '../../utils/permisos.js';
import { ModuloPermisos } from './ModuloPermisos.jsx';
import layoutStyles from '../../components/layout/WizardLayout.module.css';
import styles from './Roles.module.css';

export function RolDetallePage() {
  const { nombre } = useParams();
  const navigate = useNavigate();
  const [rol, setRol] = useState(null);
  const [funcionalidades, setFuncionalidades] = useState({});
  const [nombreEditado, setNombreEditado] = useState('');
  const [permisos, setPermisos] = useState([]);
  const [alcance, setAlcance] = useState('FRENTE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([listRoles(), listFuncionalidadesDisponibles()])
      .then(([rolesRes, funcRes]) => {
        const encontrado = rolesRes.data.find((r) => r.nombre === nombre);
        if (!encontrado) throw new Error('Rol no encontrado');
        setFuncionalidades(funcRes.data);
        setRol(encontrado);
        setNombreEditado(encontrado.nombre);
        setPermisos(encontrado.permisos);
        setAlcance(encontrado.alcance_solicitudes);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [nombre]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { alcance_solicitudes: alcance };
      if (!rol.es_admin) payload.permisos = permisos;
      if (nombreEditado.trim() !== rol.nombre) payload.nombre = nombreEditado.trim();
      await updateRol(nombre, payload);
      navigate('/configuracion/roles');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.loadingState}>Cargando...</div>;

  if (!rol) {
    return (
      <div className={styles.page}>
        <BackLink to="/configuracion/roles">Roles</BackLink>
        <div className={styles.errorBanner} role="alert">
          {error ?? 'Rol no encontrado'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <BackLink to="/configuracion/roles">Roles</BackLink>

      <section className={layoutStyles.hero}>
        <div className={layoutStyles.heroAvatar}>
          <ShieldCheck size={34} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <div className={layoutStyles.heroInfo}>
          <h1 className={layoutStyles.heroName}>{ROL_LABELS[rol.nombre] ?? rol.nombre}</h1>
          <p className={layoutStyles.heroRole}>{rol.es_admin ? 'Rol del sistema' : 'Rol personalizado'}</p>
          <p className={layoutStyles.heroMeta}>{rol.es_admin ? 'Acceso total a todas las pantallas' : `${rol.permisos.length} permiso(s) concedidos`}</p>
        </div>
        <div className={layoutStyles.heroSide}>
          <Badge variant="info">{rol.total_usuarios} cuenta(s)</Badge>
          {rol.total_usuarios > 0 && (
            <Link to={`/configuracion/usuarios?rol=${encodeURIComponent(rol.nombre)}`} className={styles.heroLink}>
              Ver cuentas
            </Link>
          )}
        </div>
      </section>

      {error && (
        <div className={styles.formError} role="alert">
          {error}
        </div>
      )}

      <form className={styles.formStack} onSubmit={handleSubmit}>
        <section className={styles.sectionCard}>
          <div>
            <h2 className={styles.sectionTitle}>Datos del rol</h2>
            <p className={styles.sectionHint}>Al renombrar, las cuentas, aprobadores de frente y desvíos que usan este rol lo conservan con el nombre nuevo.</p>
          </div>
          <div className={styles.row}>
            <Field className={styles.fieldMd} label="Nombre del rol" required>
              {(fp) => <TextInput {...fp} value={nombreEditado} onChange={(e) => setNombreEditado(e.target.value)} />}
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
          {rol.es_admin ? (
            <div className={styles.infoBanner}>El rol de administrador tiene acceso total y no se configura por módulos.</div>
          ) : (
            <ModuloPermisos value={permisos} onChange={setPermisos} funcionalidades={funcionalidades} />
          )}
        </section>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={() => navigate('/configuracion/roles')}>
            Cancelar
          </Button>
          <div className={styles.actionsEnd}>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
