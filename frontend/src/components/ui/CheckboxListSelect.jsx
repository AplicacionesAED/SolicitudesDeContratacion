// PLANTILLA -- copiado tal cual del HRMS aed (ya en produccion ahi: el
// selector de Gerencias/Procesos del formulario de Empleado). Va en
// frontend/src/components/ui/CheckboxListSelect.jsx del proyecto nuevo
// (junto con CheckboxListSelect.module.css y componentes/ui/Field.jsx, del
// que reusa `.control` para el input de busqueda).
//
// Regla que resuelve: reemplaza un <select multiple> nativo para "asignar
// de uno a muchos" (usuarios a un frente, aprobadores de una etapa,
// procesos a una gerencia) cuando la lista es larga y/o conviene poder
// buscarla -- el listbox nativo (Ctrl/Cmd+click) no es descubrible y no se
// puede filtrar. Ver la regla "Selección de uno a muchos" en
// ARQUITECTURA-FRONTEND.md para cuándo usar esto en vez de CheckboxGroup
// (lista corta y fija -- ej. una matriz de permisos -- usa CheckboxGroup,
// no esto).
//
// `options`: [{ id, label, groupLabel? }]; sin `groupLabel` en ninguna
// opcion, la lista queda plana (sin encabezados de grupo) -- con
// `groupLabel`, se agrupa (ej. Procesos agrupados por Gerencia).
import { useEffect, useMemo, useRef, useState } from 'react';
import fieldStyles from './Field.module.css';
import styles from './CheckboxListSelect.module.css';

export function CheckboxListSelect({
  options,
  selectedIds,
  onChange,
  disabled = false,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No hay opciones disponibles.',
}) {
  const [query, setQuery] = useState('');
  // La lista arranca colapsada -- se despliega al hacer click/foco en el
  // input de búsqueda (como un dropdown), en vez de mostrarse siempre
  // expandida debajo. Se mantiene abierta mientras se marcan varias
  // opciones (multi-select), y se cierra al hacer click afuera o Escape.
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q) || opt.groupLabel?.toLowerCase().includes(q));
  }, [options, query]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const opt of filtered) {
      const key = opt.groupLabel ?? '';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(opt);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const selectedOptions = useMemo(() => options.filter((opt) => selectedSet.has(String(opt.id))), [options, selectedSet]);

  function toggle(id) {
    if (disabled) return;
    const idStr = String(id);
    onChange(selectedSet.has(idStr) ? selectedIds.filter((existing) => String(existing) !== idStr) : [...selectedIds, id]);
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {selectedOptions.length > 0 && (
        <div className={styles.chips}>
          {selectedOptions.map((opt) => (
            <span key={opt.id} className={styles.chip}>
              {opt.label}
              {!disabled && (
                <button type="button" className={styles.chipRemove} onClick={() => toggle(opt.id)} aria-label={`Quitar ${opt.label}`}>
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <input
            type="text"
            className={fieldStyles.control}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            disabled={disabled}
            role="combobox"
            aria-expanded={open}
          />
          <span className={styles.count}>{selectedOptions.length} seleccionada{selectedOptions.length === 1 ? '' : 's'}</span>
          {selectedOptions.length > 0 && !disabled && (
            <button type="button" className={styles.clearButton} onClick={() => onChange([])}>
              Limpiar
            </button>
          )}
        </div>

        {/* La lista solo se monta cuando `open` -- colapsada por defecto,
            se despliega al enfocar/hacer click en el input de arriba (como
            un dropdown), no siempre visible debajo del buscador. */}
        {open && (
        // data-lenis-prevent -- divergencia respecto a la plantilla: el
        // <ReactLenis> de AppShell.jsx (este proyecto) captura el wheel
        // sobre toda el area de scroll, incluso sobre este panel con
        // overflow-y:auto propio. Sin esto, hacer scroll acá mueve la
        // página entera en vez de esta lista.
        <div className={styles.list} data-lenis-prevent>
          {filtered.length === 0 && <div className={styles.empty}>{emptyMessage}</div>}
          {grouped.map(([groupLabel, opts]) => (
            <div key={groupLabel || '__ungrouped'} className={styles.group}>
              {groupLabel && <div className={styles.groupLabel}>{groupLabel}</div>}
              {opts.map((opt) => {
                const checked = selectedSet.has(String(opt.id));
                return (
                  <label key={opt.id} className={`${styles.option} ${checked ? styles.optionChecked : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(opt.id)} disabled={disabled} />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
