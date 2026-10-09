// PLANTILLA -- copiado tal cual del HRMS aed (ya en producción ahí:
// EmpleadosListPage.jsx). Va en frontend/src/components/ui/Pagination.jsx
// (junto con Pagination.module.css y componentes/ui/Button.jsx ya copiado).
//
// Regla que resuelve: paginación única para toda tabla paginada del
// producto -- mismos botones ("‹ Anterior" / "Siguiente ›"), mismo
// "Mostrando X-Y de Z", mismo "Página X de Y" en todo proyecto, nunca un
// pager reinventado por pantalla ni botones de página numerados con
// elipsis. Ver la regla "Paginación" en ARQUITECTURA-FRONTEND.md.
//
// Se oculta sola si no hace falta paginar (total === 0 o una sola página),
// así el caller no tiene que acordarse de esa condición aparte.
//
// Uso: <Pagination page={meta.page} pageSize={meta.pageSize} total={meta.total} onPageChange={setPage} />
import { Button } from './Button.jsx';
import styles from './Pagination.module.css';
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
