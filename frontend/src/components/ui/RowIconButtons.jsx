// PLANTILLA -- copiado tal cual del HRMS aed (ya en producción ahí:
// EmpresasTab.jsx, UsuariosListPage.jsx, EmpleadosListPage.jsx,
// CatalogCrudTab.jsx). Va en frontend/src/components/ui/RowIconButtons.jsx
// (junto con RowIconButtons.module.css).
//
// Regla que resuelve: Editar y Activar/Inactivar en una fila de tabla o
// lista son SIEMPRE botones de icono, nunca botones de texto -- antes cada
// tabla que ya los quería como icono copiaba el mismo SVG a mano por
// separado, y las tablas nuevas seguían naciendo con texto "Editar"/
// "Inactivar" por comodidad. Un solo componente compartido para que la
// regla no se pueda desviar entre tablas. Ver "Row Icon Actions" en
// ARQUITECTURA-FRONTEND.md.
//
// No aplica al botón de "modo edición" a nivel de página (el par grande
// Editar/Guardar/Cancelar arriba de una ficha) -- ese es un patrón distinto
// (ver la regla de View/Edit Mode) y se queda como texto.
//
// Uso:
// <div className={styles.actionsCell}>
//   <EditIconButton label={`Editar ${item.nombre}`} onClick={() => startEdit(item)} />
//   <ToggleActivoIconButton
//     activo={item.activo}
//     labelActivar={`Activar ${item.nombre}`}
//     labelInactivar={`Inactivar ${item.nombre}`}
//     onClick={() => toggleActivo(item)}
//   />
// </div>
import styles from './RowIconButtons.module.css';

export function EditIconButton({ label, onClick, disabled, title }) {
  return (
    <button type="button" className={styles.iconButton} aria-label={label} title={title} disabled={disabled} onClick={onClick}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// `activo` decide tanto el icono (circulo+linea = inactivar, circulo+cruz =
// activar) como el color en hover (rojo solo cuando la accion es
// destructiva -- inactivar algo que hoy esta activo).
export function ToggleActivoIconButton({ activo, labelActivar, labelInactivar, onClick, disabled, title }) {
  return (
    <button
      type="button"
      className={`${styles.iconButton} ${activo ? styles.iconButtonDanger : ''}`}
      aria-label={activo ? labelInactivar : labelActivar}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {activo ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5.5 8H10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 5.5V10.5M5.5 8H10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
