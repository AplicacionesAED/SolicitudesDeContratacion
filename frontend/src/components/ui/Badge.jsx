// PLANTILLA -- copiado tal cual, va en frontend/src/components/ui/Badge.jsx.
// Usado por AppShell.jsx (items "En desarrollo" del flyout, variant="neutral")
// y por cualquier badge de estado del resto del producto. Ver la
// especificacion exacta en ARQUITECTURA-FRONTEND.md.
import styles from './Badge.module.css';

export function Badge({ variant = 'neutral', dot = false, children }) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
