// Arista custom de React Flow -- cada flecha del flujo es una ACCIÓN. Si
// `data.pildora` viene, se dibuja una píldora clickeable en el punto medio
// (navega al detalle de esa acción para editar su permiso/desvíos). Cuando
// una misma acción tiene varios orígenes posibles (ej. DEVOLVER desde 3
// estados distintos), solo UNA de esas líneas trae `pildora` -- las demás
// comparten color/estilo pero no repiten la etiqueta clickeable 3 veces. El
// conector punteado "puede desviarse a Director Técnico" (BORRADOR ->
// PENDIENTE_DIRECTOR_TECNICO) tampoco trae `pildora`, porque no es una
// acción en sí misma, es solo la indicación visual de que ENVIAR puede
// desviarse.
//
// 2026-09-02 "reorganizar para que no se crucen líneas": `data.centerX`/
// `data.centerY` fuerzan el punto de quiebre del `smoothstep` (por default
// React Flow lo calcula solo, casi siempre en el punto medio) -- sin esto,
// el punto medio auto-calculado de una línea "de vuelta" puede caer justo
// encima del carril de una línea "de ida" y cruzarse.
//
// 2026-09-02 (mismo día) "¿puedo mover las líneas también?" / "no me deja
// mover las líneas... quiero que esos puntos salgan solo en la línea que
// tengo seleccionada":
//   - El grip (`.gripArista`) SOLO se dibuja si `selected` es true -- React
//     Flow pasa esa prop automáticamente a la arista clickeada (basta con
//     `elementsSelectable` en el `<ReactFlow>`, no hace falta sincronizar
//     `edges` como estado controlado para que este prop llegue bien). Clic
//     en cualquier lado vacío del canvas deselecciona -- el grip desaparece
//     solo.
//   - El grip no se podía agarrar porque `<EdgeLabelRenderer>` renderiza su
//     contenido dentro de un contenedor con `pointer-events: none` fijo en
//     el propio CSS de la librería (para no bloquear el canvas que tiene
//     debajo) -- CUALQUIER hijo interactivo (la píldora también) necesita
//     su propio `pointer-events: auto` explícito para recibir clics/drags
//     en absoluto. Antes de este fix, un clic ahí "atravesaba" al lienzo,
//     lo que explica el reporte de "se activa el arrastre del mouse" (en
//     realidad estaba paniando el canvas, no agarrando el grip).
import { useRef } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useReactFlow } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { ACCION_NOMBRES_CORTOS } from '../../utils/solicitudes.js';
import styles from './Workflows.module.css';

export function AccionEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, selected, data }) {
  const { screenToFlowPosition } = useReactFlow();
  const arrastrando = useRef(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 14,
    ...(data.centerX != null ? { centerX: data.centerX } : {}),
    ...(data.centerY != null ? { centerY: data.centerY } : {}),
  });

  function iniciarArrastre(e) {
    e.stopPropagation();
    arrastrando.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function moverArrastre(e) {
    if (!arrastrando.current) return;
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    data.onMoveBend?.(id, pos.x, pos.y);
  }

  function terminarArrastre(e) {
    arrastrando.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  // El grip no se superpone a la píldora -- si hay píldora, el grip queda
  // corrido a la derecha; si no hay píldora (la línea no tiene acción
  // clickeable), el grip va justo en el punto de quiebre.
  const gripX = data.pildora ? labelX + 34 : labelX;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        className={styles[data.variant] ?? styles.edgeMuted}
        style={{ strokeWidth: selected ? 3 : 2, strokeDasharray: data.dashed ? '5 4' : undefined }}
        interactionWidth={20}
      />
      <EdgeLabelRenderer>
        {data.pildora && (
          <button
            type="button"
            className={`${styles.pildoraAccion} nodrag nopan`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            onClick={() => data.onNavigate(data.pildora)}
            title={data.tooltip}
          >
            {data.tieneDesvio && <Zap size={11} className={styles.pildoraDesvio} aria-hidden="true" />}
            {ACCION_NOMBRES_CORTOS[data.pildora] ?? data.pildora}
          </button>
        )}
        {selected && (
          <div
            className={`${styles.gripArista} nodrag nopan`}
            style={{ transform: `translate(-50%, -50%) translate(${gripX}px, ${labelY}px)` }}
            onPointerDown={iniciarArrastre}
            onPointerMove={moverArrastre}
            onPointerUp={terminarArrastre}
            title="Arrastra para mover esta línea"
          />
        )}
      </EdgeLabelRenderer>
    </>
  );
}
