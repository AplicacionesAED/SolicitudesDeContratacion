// Listado de workflows -- pedido explícito del usuario (2026-09-02):
// "en estos momentos existen dos, un workflow de directos y otro de
// indirectos con sus condiciones... quiero que los separemos". Antes de
// esto había UN solo diagrama con los desvíos de las dos categorías
// mezclados (la única diferencia visible era una píldora ⚡ en la acción que
// tuviera algún desvío activo, sin importar para cuál categoría). Ahora cada
// categoría es su propia fila, con su propio diagrama en
// WorkflowDiagramaPage.jsx (`/configuracion/workflows/:categoriaSlug`) --
// mismo patrón lista+detalle que Roles/Frentes.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listDesvios } from '../../api/workflows.js';
import { CATEGORIA_LABELS } from '../../utils/solicitudes.js';
import styles from './Configuracion.module.css';

const CATEGORIAS = [
  { categoria: 'DIRECTA', slug: 'directas' },
  { categoria: 'INDIRECTA', slug: 'indirectas' },
];

export function WorkflowsPage() {
  const navigate = useNavigate();
  const [desvios, setDesvios] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listDesvios()
      .then((res) => setDesvios(res.data))
      .catch((err) => setError(err.message));
  }, []);

  // Un desvío con condicion_categoria=null aplica a las dos categorías --
  // cuenta para ambas filas de esta lista, mismo criterio de filtrado que
  // usan WorkflowDiagramaPage.jsx/WorkflowDetallePage.jsx.
  function condicionesActivas(categoria) {
    if (!desvios) return null;
    return desvios.filter((d) => d.activo && (!d.condicion_categoria || d.condicion_categoria === categoria)).length;
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Workflows</h1>
      </div>
      <p style={{ margin: 0, color: 'var(--color-ink-muted)', fontSize: 'var(--text-data-size)' }}>
        El motor de aprobación tiene 16 acciones -- cuatro de ellas, "Aprobar Proyección (Controles)", "Aprobar (Residente Administrativo)", "Agregar comentario" y "Aprobar (Gerente de Compras)", solo aplican al flujo de Directas (Orden de Servicio). Cada categoría puede además tener sus propios desvíos condicionales -- por eso se muestran y se configuran por separado.
      </p>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Desvíos condicionales activos</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIAS.map(({ categoria, slug }) => (
              <tr key={slug} onClick={() => navigate(`/configuracion/workflows/${slug}`)} style={{ cursor: 'pointer' }}>
                <td>Solicitudes {CATEGORIA_LABELS[categoria]}s</td>
                <td>{condicionesActivas(categoria) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
