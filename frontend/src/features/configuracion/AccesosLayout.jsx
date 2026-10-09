// Accesos: ruta normal con su propio nav vertical (mismo patrón que
// cualquier detalle con Section Navigation), nunca un panel flotante/drawer/
// modal ni una categoría del sidebar principal -- ver la regla de Accesos en
// ARQUITECTURA-FRONTEND.md. `.contentInner` trae su propio gap (a diferencia
// del `.content` compartido del perfil, que solo envuelve una sola card).
//
// 2026-09-02: tuvo una prop `fullHeight` para intentar que
// WorkflowDiagramaPage.jsx llenara el alto de pantalla vía cascada de
// `height:100%` -- se retiró: `<ReactLenis>` (AppShell.jsx#.scrollArea)
// envuelve su contenido en un `<div>` INTERNO propio (el "content" de
// Lenis, sin className/style expuesto por la librería) cuyo alto real es
// el de SU CONTENIDO, no el del wrapper visible -- ninguna cascada de
// `height:100%` de un hijo puede atravesar ese div para llegar al alto
// real de `.scrollArea`. La solución real terminó siendo medir el alto
// disponible con JS directamente en WorkflowDiagramaPage.jsx, sin depender
// de esta cascada -- ver el comentario ahí.
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { usuarioTienePermiso } from '../../utils/permisos.js';
import styles from './AccesosLayout.module.css';

// Usuarios/Roles: gateadas por permiso granular ('ver_usuarios'/'ver_roles',
// puerto de HRMS, 2026-09-18) -- una cuenta a la que se le dio solo uno de
// los dos no debe ver un link al otro que igual la rebotaria via
// ProtectedRoute. Workflows/Proyectos/Frentes no se pidio desglosarlas,
// siguen 100% soloAdmin -- se ocultan con `soloAdmin: true` en vez de un
// permiso que no existe.
const SECCIONES = [
  { label: 'Usuarios', to: '/configuracion/usuarios', permiso: 'ver_usuarios' },
  { label: 'Roles', to: '/configuracion/roles', permiso: 'ver_roles' },
  { label: 'Workflows', to: '/configuracion/workflows', soloAdmin: true },
  { label: 'Proyectos', to: '/configuracion/proyectos', soloAdmin: true },
  { label: 'Frentes', to: '/configuracion/frentes', soloAdmin: true },
];

export function AccesosLayout({ children }) {
  const { usuario } = useAuth();
  const secciones = SECCIONES.filter((s) => {
    if (s.soloAdmin) return usuario?.esAdmin;
    if (s.permiso) return usuario?.esAdmin || usuarioTienePermiso(usuario, s.permiso);
    return true;
  });

  return (
    <div className={styles.wrap}>
      <nav className={styles.nav} aria-label="Secciones de Accesos">
        {secciones.map((s) => (
          <NavLink key={s.to} to={s.to} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
            {s.label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.contentInner}>{children}</div>
    </div>
  );
}
