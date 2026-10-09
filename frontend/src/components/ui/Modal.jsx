// Nuevo -- no viene en la plantilla (que evita modales para crear/editar
// entidades, ver "Cuándo SÍ vale una página de edición dedicada" en
// ARQUITECTURA-FRONTEND.md). Este SÍ es el caso legítimo que esa regla no
// cubre: una confirmación corta con un campo o dos (nota, número de
// contrato) antes de una transición de estado de Solicitud -- no un form de
// entidad completo, así que no le toca su propia ruta.
import { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

export function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      {/* data-lenis-prevent -- el <ReactLenis> de AppShell.jsx captura el
          wheel sobre toda el area de scroll; sin esto, un dialogo con
          contenido largo (overflow-y:auto propio) haría scroll de la página
          de fondo en vez de a sí mismo. */}
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title} data-lenis-prevent>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
