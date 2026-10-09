// PLANTILLA -- copiado tal cual del HRMS aed. Va en
// frontend/src/hooks/useSortableTable.js del proyecto nuevo.
//
// Regla que resuelve: toda tabla de datos con columnas comparables (texto,
// numero, fecha) debe poder ordenarse haciendo click en el encabezado -- ver
// "Sortable columns" en ARQUITECTURA-FRONTEND.md. Se usa siempre junto a
// SortHeader.jsx (componentes/ui/), nunca reimplementado por pantalla.
//
// Uso: identico en toda tabla que lo consume.
//   const valueGetters = useMemo(() => ({
//     nombre: (fila) => `${fila.primer_nombre} ${fila.apellidos}`,
//     salario_base: (fila) => Number(fila.salario_base ?? 0),
//   }), []);
//   const { sortedRows, sort, toggleSort } = useSortableTable(filas, valueGetters);
import { useMemo, useState } from 'react';

// Orden de 3 clics por columna, compartido por todas las tablas del
// producto: sin ordenar -> ascendente -> descendente -> sin ordenar de
// nuevo. `valueGetters` es un mapa `{ columnKey: (fila) => valorComparable }`
// -- cada tabla lo define una vez junto a sus columnas, asi una columna con
// Link/Badge/formato especial puede exponer el valor "de verdad" a comparar
// (ej. el nombre completo, no el JSX del link).
export function useSortableTable(rows, valueGetters) {
  const [sort, setSort] = useState({ key: null, direction: null });

  function toggleSort(key) {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  }

  const sortedRows = useMemo(() => {
    if (!sort.key || !sort.direction) return rows;
    const getValue = valueGetters[sort.key];
    if (!getValue) return rows;

    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      const vacia = va === null || va === undefined || va === '';
      const vbcia = vb === null || vb === undefined || vb === '';
      if (vacia && vbcia) return 0;
      if (vacia) return 1;
      if (vbcia) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
      return String(va).localeCompare(String(vb), 'es', { numeric: true, sensitivity: 'base' }) * factor;
    });
  }, [rows, sort, valueGetters]);

  return { sortedRows, sort, toggleSort };
}

export function ariaSort(sort, key) {
  if (sort.key !== key) return 'none';
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}
