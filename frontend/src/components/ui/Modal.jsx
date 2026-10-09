import { useEffect, useRef } from 'react';
import styles from './Modal.module.css';

export function Modal({ open, onClose, title, children, footer }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {/* data-lenis-prevent: el <ReactLenis> de AppShell captura el wheel sobre toda el area de scroll; sin esto un
          dialogo con contenido largo haria scroll de la pagina de fondo en vez de a si mismo. */}
      <div className={styles.body} data-lenis-prevent>
        {children}
      </div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </dialog>
  );
}
