// PLANTILLA -- copiado tal cual del HRMS aed. Va en
// frontend/src/components/ui/BackLink.jsx del proyecto nuevo (junto con
// BackLink.module.css). Requiere `react-router-dom`.
//
// Regla que resuelve: toda ruta a la que se entra "drilling down" (un :id
// concreto, ej. /empleados/:id/perfil, NO una pestaña hermana como
// /nomina/:section) debe tener una forma de volver DENTRO de la pagina --
// el sidebar nunca es aceptable como unica salida (abrir la categoria +
// volver a hacer click en el item son dos pasos extra, y obliga a
// renavegar el arbol en vez de simplemente retroceder un paso). Ver
// ARQUITECTURA-FRONTEND.md, "Back Link", para el detalle completo.
//
// Uso: <BackLink to="/empleados">Empleados</BackLink> en el header de la
// pagina de destino -- no se rediseña, no se reinventa por pantalla.
import { Link } from 'react-router-dom';
import styles from './BackLink.module.css';

export function BackLink({ to, children }) {
  return (
    <Link to={to} className={styles.backLink}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M8.5 3L4 7L8.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </Link>
  );
}
