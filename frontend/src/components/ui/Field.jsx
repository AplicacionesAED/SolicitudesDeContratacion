// PLANTILLA -- copiado tal cual, va en frontend/src/components/ui/Field.jsx.
// Este es el componente base de TODO formulario del producto (login
// incluido) -- si un proyecto nuevo lo reescribe desde cero en vez de
// copiarlo, la altura/padding/tipografia del input terminan LIGERAMENTE
// distintos sin que se note a simple vista hasta que se comparan lado a
// lado (encontrado como problema real: un proyecto copiado a mano perdio
// el padding exacto y la altura de los inputs quedo distinta). Copiar este
// archivo tal cual es la unica forma de garantizar 100% de paridad.
//
// Patron render-prop, no wrapper de input directo -- `children` es una
// funcion que recibe { id, aria-invalid, aria-describedby } ya resueltos,
// asi el mismo Field sirve para TextInput, Select, Textarea, o un widget
// custom. Ver ARQUITECTURA-FRONTEND.md, "Componente Field", para el patron
// completo y la especificacion exacta de medidas.
//
// 2026-09-09: `Textarea` YA NO es copia literal de la plantilla -- gana
// auto-crecimiento vertical + sin resize manual (pedido explícito del
// usuario), ver el comentario puntual sobre `Textarea` más abajo. Si se
// vuelve a sincronizar este archivo desde `Plantilla-Arquitectura-AED`,
// hay que volver a aplicar ese cambio a mano.
import { useId } from 'react';
import styles from './Field.module.css';

export function Field({ label, required, error, helper, children, className = '' }) {
  const id = useId();
  const child = children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined });

  return (
    <div className={`${styles.field} ${className}`}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      {child}
      {error ? (
        <span id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </span>
      ) : helper ? (
        <span className={styles.helper}>{helper}</span>
      ) : null}
    </div>
  );
}

export function TextInput({ className = '', invalid, ...props }) {
  return <input className={`${styles.control} ${invalid ? styles.invalid : ''} ${className}`} {...props} />;
}

// 2026-09-09 "que los textareas no se puedan agrandar a mano, solo que
// crezcan solos si hace falta": esto YA NO es una copia literal de la
// plantilla (ver el comentario de arriba del archivo) -- se agregó el
// truco CSS-only "grid + `::after` replicado" (mismo mecanismo que
// `CuadroComparativoBuilder.jsx#.growWrap`, ver el comentario grande ahí
// para el detalle completo): un pseudo-elemento invisible replica el mismo
// texto vía `data-replicated-value` y comparte el `grid-area` del
// `<textarea>` real, así que el alto del grid termina siendo el que el
// texto necesita, sin JS de medición ni refs. `rows` en el `<textarea>`
// sigue fijando el alto MÍNIMO (ej. `rows={2}` empieza en 2 líneas) --
// crecer por encima de eso es automático. Como TODO el resto del producto
// pasa por este mismo componente, este único cambio aplica el
// comportamiento a cada textarea de la app de una sola vez.
export function Textarea({ className = '', invalid, ...props }) {
  return (
    <div className={styles.growWrap} data-replicated-value={props.value ?? ''}>
      <textarea className={`${styles.control} ${invalid ? styles.invalid : ''} ${className}`} {...props} />
    </div>
  );
}

export function Select({ className = '', invalid, children, ...props }) {
  return (
    <select className={`${styles.control} ${invalid ? styles.invalid : ''} ${className}`} {...props}>
      {children}
    </select>
  );
}
