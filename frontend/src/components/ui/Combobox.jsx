// Nuevo -- no viene copiable en la plantilla, solo documentado como patrón
// ("Combobox de búsqueda grande" en ARQUITECTURA-FRONTEND.md, sección
// "Accesorios reutilizables ya resueltos"): un input de texto + lista
// flotante de resultados, nunca un `<select>` con cientos/miles de
// `<option>` (el caso real: el selector de contratista de
// SolicitudForm.jsx, ~390 terceros, antes era un buscador de texto SUELTO
// más un `<select>` gigante aparte -- dos controles para una sola decisión).
//
// Selección única: cerrado, el input muestra la etiqueta de la opción ya
// elegida (se ve como un campo normal); al enfocarlo se limpia para poder
// escribir y filtrar, y la lista flotante aparece debajo. Elegir una opción
// (click o Enter) cierra la lista y dispara `onChange`; perder el foco sin
// elegir nada revierte el texto a la selección vigente, nunca la borra sola.
import { useEffect, useRef, useState } from 'react';
import styles from './Combobox.module.css';

export function Combobox({ id, options, value, onChange, placeholder = 'Buscar...', emptyMessage = 'Sin resultados.', disabled = false, invalid = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return undefined;
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  function selectOption(option) {
    onChange(option.value);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={styles.wrap}>
      <input
        id={id}
        type="text"
        className={`${styles.input} ${invalid ? styles.invalid : ''}`}
        placeholder={placeholder}
        value={open ? query : (selected?.label ?? '')}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
      />
      {open && (
        // data-lenis-prevent -- el <ReactLenis> de AppShell.jsx envuelve toda
        // el area de scroll y por defecto captura el wheel del mouse para su
        // propio smooth-scroll, incluso sobre este panel flotante (su
        // overflow-y:auto nunca llega a recibir el evento). Este atributo le
        // dice a Lenis que ignore el wheel acá y deje el scroll nativo del
        // panel funcionar.
        <div className={styles.panel} role="listbox" data-lenis-prevent>
          {filtered.length === 0 && <div className={styles.empty}>{emptyMessage}</div>}
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`${styles.option} ${o.value === value ? styles.optionSelected : ''}`}
              onClick={() => selectOption(o)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
