import { useId } from 'react';
import styles from './InfoTooltip.module.css';

// Icono "i" con tooltip al hover/focus, para explicar que muestra un KPI o
// grafico sin ocupar espacio permanente en la interfaz -- ver "Info Tooltip"
// en DESIGN.md §5 Componentes. `tabIndex={0}` + `:focus-visible` lo hacen
// alcanzable por teclado, no solo por mouse; `role="tooltip"` +
// `aria-describedby` lo conectan para lectores de pantalla.
export function InfoTooltip({ text }) {
  const id = useId();

  return (
    <span className={styles.wrapper} tabIndex={0} aria-describedby={id}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7 6.4V10.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="7" cy="4.2" r="0.9" fill="currentColor" />
      </svg>
      <span role="tooltip" id={id} className={styles.bubble}>
        {text}
      </span>
    </span>
  );
}
