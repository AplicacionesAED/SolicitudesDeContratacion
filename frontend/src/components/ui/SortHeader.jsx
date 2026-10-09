import styles from './SortHeader.module.css';

// Se coloca DENTRO de un <th> ya existente (no reemplaza al <th> en si) para
// heredar el padding/tipografia que cada tabla ya define en su propio CSS
// Module -- este componente solo agrega el boton clicable + la flecha de
// orden, sin pelearse por especificidad de CSS con la tabla que lo usa.
export function SortHeader({ label, sortKey, sort, onSort, align = 'left' }) {
  const direction = sort.key === sortKey ? sort.direction : null;
  return (
    <button type="button" className={styles.sortHeader} data-align={align} onClick={() => onSort(sortKey)}>
      <span>{label}</span>
      <span className={styles.arrow} data-active={direction != null || undefined}>
        {direction === 'asc' ? '▲' : direction === 'desc' ? '▼' : '⇅'}
      </span>
    </button>
  );
}
