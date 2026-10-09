// El input nativo real sigue existiendo (visualmente oculto, no
// display:none) para que el teclado/lector de pantalla lo manejen normal --
// la caja estilizada es un hermano CSS (`input:checked + .box`), nunca un
// div que simula un checkbox a mano sin input real detras.
import styles from './Checkbox.module.css';

export function Checkbox({ label, className = '', ...props }) {
  return (
    <label className={`${styles.checkbox} ${className}`}>
      <input type="checkbox" className={styles.input} {...props} />
      <span className={styles.box} aria-hidden="true">
        <svg className={styles.check} width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}
