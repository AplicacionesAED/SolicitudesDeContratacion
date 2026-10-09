// Lista de roles -- la edición de permisos (ahora un bloque grande: "ver
// todas" + Directas/Indirectas/Terceros/Otros) vive en su propia ruta
// (RolDetallePage.jsx), mismo patrón que Frentes: fila clickeable en la
// lista, edición completa aparte, en vez de tener las ~7 checkboxes de
// cada uno de los 9 roles desplegadas todas a la vez en esta pantalla.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listRoles, listFuncionalidadesDisponibles } from '../../api/roles.js';
import { ROL_LABELS, ALCANCE_SOLICITUDES_LABELS } from '../../utils/permisos.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { useSortableTable, ariaSort } from '../../hooks/useSortableTable.js';
import styles from './Configuracion.module.css';

// Etiquetas cortas para esta tabla -- `funcionalidades[slug].nombre` (el
// mismo texto que usa RolDetallePage.jsx) es más descriptivo ("Ver
// Solicitudes Directas") de lo que entra cómodo en una celda repetida hasta
// 7 veces por fila.
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

// Mismo orden para las badges de permisos en TODAS las filas -- antes cada
// rol mostraba su array `permisos` tal cual venía de la base (el orden en
// que se fueron marcando los checkboxes históricamente), así que la misma
// badge quedaba en una columna visual distinta fila a fila. Agrupado por
// módulo (Directas, Indirectas, Terceros, Especialidades), mismo criterio
// que el árbol de RolDetallePage.jsx. Un slug que no esté acá (no debería
// pasar, pero por si el admin agrega uno nuevo) se va al final, sin romper
// el resto del orden.
const ORDEN_PERMISOS = [
  'ver_solicitudes_directas',
  'crear_solicitudes_directas',
  'ver_solicitudes_indirectas',
  'crear_solicitudes_indirectas',
  'ver_terceros',
  'crear_terceros',
  'ver_especialidades',
  'gestionar_especialidades',
];

function ordenarPermisos(permisos) {
  return [...permisos].sort((a, b) => {
    const ia = ORDEN_PERMISOS.indexOf(a);
    const ib = ORDEN_PERMISOS.indexOf(b);
    return (ia === -1 ? ORDEN_PERMISOS.length : ia) - (ib === -1 ? ORDEN_PERMISOS.length : ib);
  });
}

export function RolesPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [funcionalidades, setFuncionalidades] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([listRoles(), listFuncionalidadesDisponibles()])
      .then(([rolesRes, funcRes]) => {
        setRoles(rolesRes.data);
        setFuncionalidades(funcRes.data);
      })
      .catch((err) => setError(err.message));
  }, []);

  const valueGetters = useMemo(
    () => ({
      nombre: (rol) => ROL_LABELS[rol.nombre] ?? rol.nombre,
      permisos: (rol) => rol.permisos.length,
      alcance: (rol) => ALCANCE_SOLICITUDES_LABELS[rol.alcance_solicitudes] ?? rol.alcance_solicitudes,
    }),
    []
  );
  const { sortedRows, sort, toggleSort } = useSortableTable(roles, valueGetters);

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Roles y permisos</h1>
        <Button type="button" onClick={() => navigate('/configuracion/roles/nuevo')}>
          Crear rol
        </Button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort(sort, 'nombre')}><SortHeader label="Rol" sortKey="nombre" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'permisos')}><SortHeader label="Permisos" sortKey="permisos" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'alcance')}><SortHeader label="Alcance de solicitudes" sortKey="alcance" sort={sort} onSort={toggleSort} /></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((rol) => (
              <tr key={rol.nombre} onClick={() => navigate(`/configuracion/roles/${rol.nombre}`)} style={{ cursor: 'pointer' }}>
                <td>{ROL_LABELS[rol.nombre] ?? rol.nombre}</td>
                <td>
                  {rol.permisos.length === 0 ? (
                    <span style={{ color: 'var(--color-ink-muted)' }}>Sin permisos de módulo (aprobar depende de Aprobadores de Frente)</span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {ordenarPermisos(rol.permisos).map((slug) => (
                        <Badge key={slug} variant="neutral">{LABEL_CORTO[slug] ?? funcionalidades[slug]?.nombre ?? slug}</Badge>
                      ))}
                    </div>
                  )}
                </td>
                <td>{ALCANCE_SOLICITUDES_LABELS[rol.alcance_solicitudes] ?? rol.alcance_solicitudes}</td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={3} className={styles.emptyState}>Sin roles todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
