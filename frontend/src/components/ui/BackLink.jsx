import { Link } from 'react-router-dom';
import styles from './BackLink.module.css';

// Toda ruta a la que se entra "drilling down" (un :id concreto, no una
// pestaña hermana) debe traer uno de estos en el header -- el sidebar
// nunca es la unica forma de volver (ver DESIGN.md, Navigation).
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
