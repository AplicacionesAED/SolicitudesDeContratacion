import styles from './Badge.module.css';

export function Badge({ variant = 'neutral', dot = false, children }) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
