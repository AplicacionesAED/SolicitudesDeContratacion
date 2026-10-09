import { Button } from './Button.jsx';
import styles from './Pagination.module.css';

// Paginacion unica para toda tabla paginada del producto -- mismos botones
// ("‹ Anterior" / "Siguiente ›"), mismo "Mostrando X-Y de Z", mismo
// "Pagina X de Y". Se oculta sola si no hace falta paginar (una sola
// pagina), asi el caller no tiene que acordarse de esa condicion aparte.
export function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0 || totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={styles.footer}>
      <span className={styles.footerText}>
        Mostrando {from}–{to} de {total}
      </span>
      <div className={styles.pagination}>
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          ‹ Anterior
        </Button>
        <span className={styles.footerText}>
          Página {page} de {totalPages}
        </span>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Siguiente ›
        </Button>
      </div>
    </div>
  );
}
