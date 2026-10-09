// PLANTILLA -- copiado tal cual, va en frontend/src/components/ui/Button.jsx.
// 4 variantes: primary (unica con fill de marca -- Rationed Brand Rule),
// secondary, ghost, danger. Ver la especificacion exacta en
// ARQUITECTURA-FRONTEND.md.
import styles from './Button.module.css';

export function Button({ variant = 'primary', className = '', ...props }) {
  return <button className={`${styles.button} ${styles[variant]} ${className}`} {...props} />;
}
