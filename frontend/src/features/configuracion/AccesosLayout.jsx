// Mismo diseno que el menu de Configuracion del HRMS y Cartera (migracion de diseno 2026-10-09): nav
// vertical a la izquierda con secciones agrupadas (titulo + icono + texto de ayuda), siempre visible
// -- "donde estoy" nunca se pierde. Configuracion es una ruta normal, nunca un drawer/panel flotante.
// App.jsx envuelve cada pantalla de /configuracion/* en este layout (las pantallas no lo importan).
import { NavLink, useLocation } from 'react-router-dom';
import { FolderKanban, GitBranch, Layers, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { usuarioTienePermiso } from '../../utils/permisos.js';
import layoutStyles from '../../components/layout/WizardLayout.module.css';
import styles from './AccesosLayout.module.css';

// Usuarios/Roles: gateadas por permiso granular ('ver_usuarios'/'ver_roles') -- una cuenta con solo uno
// de los dos no debe ver un link al otro que igual la rebotaria via ProtectedRoute. Workflows, Proyectos
// y Frentes siguen 100% soloAdmin.
export const CONFIG_GRUPOS = [
  {
    titulo: 'Accesos',
    secciones: [
      { key: 'usuarios', label: 'Usuarios', hint: 'Cuentas y roles', to: '/configuracion/usuarios', permiso: 'ver_usuarios', icon: Users },
      { key: 'roles', label: 'Roles', hint: 'Permisos y alcance', to: '/configuracion/roles', permiso: 'ver_roles', icon: ShieldCheck },
    ],
  },
  {
    titulo: 'Flujo',
    secciones: [{ key: 'workflows', label: 'Workflows', hint: 'Desvíos y diagrama del flujo', to: '/configuracion/workflows', soloAdmin: true, icon: GitBranch }],
  },
  {
    titulo: 'Estructura',
    secciones: [
      { key: 'proyectos', label: 'Proyectos', hint: 'Proyectos de obra', to: '/configuracion/proyectos', soloAdmin: true, icon: FolderKanban },
      { key: 'frentes', label: 'Frentes', hint: 'Frentes y aprobadores', to: '/configuracion/frentes', soloAdmin: true, icon: Layers },
    ],
  },
];

export function AccesosLayout({ children, className = '' }) {
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  const visible = (seccion) => {
    if (seccion.soloAdmin) return usuario?.esAdmin;
    if (seccion.permiso) return usuario?.esAdmin || usuarioTienePermiso(usuario, seccion.permiso);
    return true;
  };
  const gruposVisibles = CONFIG_GRUPOS.map((grupo) => ({ ...grupo, secciones: grupo.secciones.filter(visible) })).filter((grupo) => grupo.secciones.length > 0);
  // El diagrama de workflows necesita todo el ancho para el canvas: el contenido no se centra ni se limita.
  const esDiagrama = /\/configuracion\/workflows\/[^/]+$/.test(pathname) && !/\/configuracion\/workflows\/[^/]+\/[^/]+$/.test(pathname);

  return (
    <div className={`${styles.body} ${className}`}>
      <nav className={styles.nav} aria-label="Secciones de Configuración">
        <p className={styles.navHeading}>Configuración</p>
        {gruposVisibles.map((grupo) => (
          <div key={grupo.titulo} className={styles.navGroup}>
            <span className={styles.navGroupTitle}>{grupo.titulo}</span>
            {grupo.secciones.map((seccion) => {
              const Icono = seccion.icon;
              return (
                <NavLink key={seccion.key} to={seccion.to} className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                  <span className={styles.navIcon}>
                    <Icono size={17} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className={styles.navText}>
                    <span className={styles.navLabel}>{seccion.label}</span>
                    <span className={styles.navHint}>{seccion.hint}</span>
                  </span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={`${layoutStyles.content} ${styles.content}`} data-diagrama={esDiagrama ? 'true' : undefined}>
        <div className={styles.contentInner}>{children}</div>
      </div>
    </div>
  );
}
