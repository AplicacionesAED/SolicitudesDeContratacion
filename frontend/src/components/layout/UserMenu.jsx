// PLANTILLA -- copiado tal cual, va en frontend/src/components/layout/
// UserMenu.jsx (carpeta hermana de AppShell.jsx, que lo importa y lo monta
// en su .topbar -- ver el comentario de AppShell.jsx). Requiere el paquete
// de auth (componentes/auth/frontend/AuthContext.jsx) ya copiado.
//
// Mismo patron que un dropdown de notificaciones tipico: containerRef +
// onBlurCapture para cerrar al perder el foco, panel `position:absolute`
// anclado a la derecha del trigger (ver UserMenu.module.css).
//
// Que SI cambia por proyecto: la condicion `usuario.rol === 'empleado'`
// que decide si se muestra "Mi perfil" -- en el HRMS, ese rol especifico es
// el unico que tiene una pagina de autoservicio a la que enlazar
// ("/mi-perfil"). Si el proyecto nuevo tiene roles distintos, o si TODOS
// los roles tienen una pantalla de "mi perfil", ajusta esta condicion (o
// quitala del todo).
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import styles from './UserMenu.module.css';

function initials(nombre) {
  return (nombre ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function UserMenu() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  if (!usuario) return null;

  function closeIfFocusLeft(event) {
    if (!containerRef.current?.contains(event.relatedTarget)) {
      setOpen(false);
    }
  }

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div ref={containerRef} className={styles.container} onBlurCapture={closeIfFocusLeft}>
      <button type="button" className={styles.trigger} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((prev) => !prev)}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(usuario.nombre)}
        </span>
        <span className={styles.name}>{usuario.nombre}</span>
      </button>

      {open && (
        <div className={styles.panel} role="menu">
          <div className={styles.panelHeader}>
            <span className={styles.panelName}>{usuario.nombre}</span>
            <span className={styles.panelEmail}>{usuario.email}</span>
          </div>

          <Link to="/perfil" role="menuitem" className={styles.item} onClick={() => setOpen(false)}>
            <User size={16} strokeWidth={1.75} aria-hidden="true" />
            Mi perfil
          </Link>

          <button type="button" role="menuitem" className={styles.item} onClick={handleLogout}>
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
