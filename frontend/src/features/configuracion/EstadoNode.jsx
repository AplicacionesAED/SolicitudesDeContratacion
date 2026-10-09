// Nodo custom de React Flow para WorkflowDiagramaPage.jsx -- representa un
// ESTADO (fijo, no editable acá, ver solicitud.estado.js#ESTADOS_ORIGEN/
// ESTADO_DESTINO). Los Handle son solo puntos de anclaje para las flechas
// predefinidas (el diagrama es de solo lectura en cuanto a su FORMA --
// `nodesConnectable={false}` en WorkflowDiagramaPage.jsx impide que alguien
// dibuje una conexión nueva arrastrando desde un handle).
//
// 2026-09-02 "reorganizar para que no se crucen líneas": un handle puede
// traer `offset` (0-100, posición a lo largo del lado en vez del centro
// default de React Flow) -- necesario para nodos con varias relaciones del
// mismo lado (ej. ENVIADA recibe/envía 4 cosas distintas por su lado
// derecho) -- sin esto, todas esas líneas nacían/llegaban al mismo pixel
// exacto y se cruzaban entre sí al abrirse en abanico hacia destinos a
// distinta altura.
import { Handle, Position } from '@xyflow/react';
import styles from './Workflows.module.css';

const CLASE_VARIANTE = {
  success: styles.nodoSuccess,
  warning: styles.nodoWarning,
  danger: styles.nodoDanger,
  info: styles.nodoInfo,
  neutral: styles.nodoNeutral,
};

function estiloOffset(position, offset) {
  if (offset == null) return undefined;
  const eje = position === Position.Left || position === Position.Right ? 'top' : 'left';
  return { [eje]: `${offset}%` };
}

export function EstadoNode({ data }) {
  return (
    <div className={`${styles.nodo} ${CLASE_VARIANTE[data.variant] ?? styles.nodoNeutral} ${data.fantasma ? styles.nodoFantasma : ''}`}>
      {data.handles.map((h) => (
        <Handle key={h.id} id={h.id} type={h.type} position={h.position} className={styles.handle} style={estiloOffset(h.position, h.offset)} />
      ))}
      <span>{data.label}</span>
      {data.nota && <span className={styles.nodoNota}>{data.nota}</span>}
    </div>
  );
}
