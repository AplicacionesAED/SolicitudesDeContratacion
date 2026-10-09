import { useId } from 'react';
import styles from './Field.module.css';

export function Field({ label, required, error, helper, children, className = '' }) {
  const id = useId();
  const child = children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined });

  return (
    <div className={`${styles.field} ${className}`}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      {child}
      {error ? (
        <span id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </span>
      ) : helper ? (
        <span className={styles.helper}>{helper}</span>
      ) : null}
    </div>
  );
}

export function TextInput({ className = '', invalid, ...props }) {
  return <input className={`${styles.control} ${invalid ? styles.invalid : ''} ${className}`} {...props} />;
}

// Textarea con auto-crecimiento vertical y SIN resize manual (pedido explicito del usuario,
// 2026-09-09: "que no se puedan agrandar a mano, solo que crezcan solos"). Truco CSS-only "grid +
// `::after` replicado": un pseudo-elemento invisible replica el mismo texto via
// `data-replicated-value` y comparte el `grid-area` del <textarea> real, asi que el alto del grid
// termina siendo el que el texto necesita, sin JS de medicion ni refs. `rows` sigue fijando el alto
// MINIMO. Como todo el producto pasa por este componente, aplica a cada textarea de la app.
// OJO: esto es lo UNICO que difiere del Field.jsx del HRMS -- si se vuelve a sincronizar desde alli,
// hay que conservarlo (y las reglas `.growWrap` de Field.module.css).
export function Textarea({ className = '', invalid, ...props }) {
  return (
    <div className={styles.growWrap} data-replicated-value={props.value ?? ''}>
      <textarea className={`${styles.control} ${invalid ? styles.invalid : ''} ${className}`} {...props} />
    </div>
  );
}

export function Select({ className = '', invalid, children, ...props }) {
  return (
    <select className={`${styles.control} ${invalid ? styles.invalid : ''} ${className}`} {...props}>
      {children}
    </select>
  );
}
