// Lista de roles con el mismo diseno que la del HRMS y Cartera (migracion de diseno 2026-10-09): una fila por rol
// con su tipo (sistema / personalizado), a que pantallas da acceso, el alcance de solicitudes y cuantas cuentas lo
// tienen (enlaza a esas cuentas). La edicion vive en su propia ruta (RolDetallePage.jsx).
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { useSortableTable, ariaSort } from '../../hooks/useSortableTable.js';
import { listRoles, listFuncionalidadesDisponibles } from '../../api/roles.js';
import { ROL_LABELS, ALCANCE_SOLICITUDES_LABELS } from '../../utils/permisos.js';
import styles from './Roles.module.css';

const MAX_VISIBLES = 4;

// Etiquetas cortas: el nombre completo de la funcionalidad ("Ver Solicitudes Directas") no cabe repetido en una celda.
const LABEL_CORTO = {
  ver_solicitudes_directas: 'Ver Directas',
  crear_solicitudes_directas: 'Crear Directas',
  ver_solicitudes_indirectas: 'Ver Indirectas',
  crear_solicitudes_indirectas: 'Crear Indirectas',
  ver_terceros: 'Ver Terceros',
  crear_terceros: 'Crear Terceros',
  ver_especialidades: 'Ver Especialidades',
  gestionar_especialidades: 'Especialidades',
};

// Mismo orden de badges en todas las filas (agrupado por modulo); un slug desconocido va al final.
const ORDEN_PERMISOS = Object.keys(LABEL_CORTO);
const ordenarPermisos = (permisos) =>
  [...permisos].sort((a, b) => {
    const ia = ORDEN_PERMISOS.indexOf(a);
    const ib = ORDEN_PERMISOS.indexOf(b);
    return (ia === -1 ? ORDEN_PERMISOS.length : ia) - (ib === -1 ? ORDEN_PERMISOS.length : ib);
  });

const etiquetaRol = (rol) => ROL_LABELS[rol.nombre] ?? rol.nombre;

export function RolesPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [funcionalidades, setFuncionalidades] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([listRoles(), listFuncionalidadesDisponibles()])
      .then(([rolesRes, funcRes]) => {
        setRoles(rolesRes.data);
        setFuncionalidades(funcRes.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const valueGetters = useMemo(
    () => ({
      nombre: (rol) => etiquetaRol(rol),
      alcance: (rol) => ALCANCE_SOLICITUDES_LABELS[rol.alcance_solicitudes] ?? rol.alcance_solicitudes,
      usuarios: (rol) => rol.total_usuarios,
    }),
    []
  );
  const { sortedRows, sort, toggleSort } = useSortableTable(roles, valueGetters);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Roles y permisos</h1>
            <p className={styles.subtitle}>Un rol define a qué pantallas entra una cuenta y cuántas solicitudes ve. Aprobar depende de los aprobadores de cada frente.</p>
          </div>
          <div className={styles.headerActions}>
            <Button variant="primary" onClick={() => navigate('/configuracion/roles/nuevo')}>
              Crear rol
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          No se pudo completar la operación: {error}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort(sort, 'nombre')}>
                <SortHeader label="Rol" sortKey="nombre" sort={sort} onSort={toggleSort} />
              </th>
              <th>Acceso</th>
              <th aria-sort={ariaSort(sort, 'alcance')}>
                <SortHeader label="Solicitudes que ve" sortKey="alcance" sort={sort} onSort={toggleSort} />
              </th>
              <th aria-sort={ariaSort(sort, 'usuarios')}>
                <SortHeader label="Cuentas" sortKey="usuarios" sort={sort} onSort={toggleSort} />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className={styles.emptyState}>
                  Cargando...
                </td>
              </tr>
            ) : roles.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyState}>
                  Todavía no hay roles creados.
                </td>
              </tr>
            ) : (
              sortedRows.map((rol) => {
                const permisos = ordenarPermisos(rol.permisos);
                const visibles = permisos.slice(0, MAX_VISIBLES);
                return (
                  <tr key={rol.nombre} className={styles.clickableRow} onClick={() => navigate(`/configuracion/roles/${encodeURIComponent(rol.nombre)}`)}>
                    <td>
                      <div className={styles.rolCell}>
                        <span className={styles.rolIcon}>
                          <ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" />
                        </span>
                        <span className={styles.rolTexto}>
                          <span className={styles.nameText}>{etiquetaRol(rol)}</span>
                          <span className={styles.rolTipo}>{rol.es_admin ? 'Rol del sistema' : 'Personalizado'}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.permisosCell}>
                        {rol.es_admin ? (
                          <Badge variant="info">Acceso total</Badge>
                        ) : permisos.length === 0 ? (
                          <span className={styles.muted}>Sin pantallas</span>
                        ) : (
                          <>
                            {visibles.map((slug) => (
                              <Badge key={slug} variant="neutral">
                                {LABEL_CORTO[slug] ?? funcionalidades[slug]?.nombre ?? slug}
                              </Badge>
                            ))}
                            {permisos.length > visibles.length && <Badge variant="info">+{permisos.length - visibles.length}</Badge>}
                          </>
                        )}
                      </div>
                    </td>
                    <td>{rol.es_admin ? <span className={styles.muted}>Todas</span> : ALCANCE_SOLICITUDES_LABELS[rol.alcance_solicitudes] ?? rol.alcance_solicitudes}</td>
                    <td onClick={(event) => event.stopPropagation()}>
                      {rol.total_usuarios > 0 ? (
                        <Link to={`/configuracion/usuarios?rol=${encodeURIComponent(rol.nombre)}`} className={styles.cuentasLink}>
                          {rol.total_usuarios}
                        </Link>
                      ) : (
                        <span className={styles.muted}>0</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
