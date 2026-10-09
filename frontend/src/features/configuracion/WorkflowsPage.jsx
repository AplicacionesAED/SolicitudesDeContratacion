// Lista de workflows con el diseno del HRMS y Cartera (migracion de diseno 2026-10-09): una fila por categoria
// (Directas / Indirectas), cada una con su propio diagrama (WorkflowDiagramaPage.jsx) y su cuenta de desvios
// condicionales activos. El motor de aprobacion es UNO solo compartido; lo que cambia por categoria son los desvios.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch } from 'lucide-react';
import { listDesvios } from '../../api/workflows.js';
import { CATEGORIA_LABELS } from '../../utils/solicitudes.js';
import { Badge } from '../../components/ui/Badge.jsx';
import styles from './Usuarios.module.css';
import roles from './Roles.module.css';

const CATEGORIAS = [
  { categoria: 'DIRECTA', slug: 'directas', detalle: 'Contrato y orden de servicio de contratación directa.' },
  { categoria: 'INDIRECTA', slug: 'indirectas', detalle: 'Contrato, orden de servicio y otrosí de contratación indirecta.' },
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

  // Un desvio con condicion_categoria=null aplica a las dos categorias: cuenta para ambas filas.
  const aplicables = (categoria) => (desvios ?? []).filter((d) => !d.condicion_categoria || d.condicion_categoria === categoria);
  const activos = (categoria) => aplicables(categoria).filter((d) => d.activo).length;

  return (
    <div className={styles.page}>
      <div className={styles.listHeader}>
        <div>
          <h1 className={styles.title}>Workflows</h1>
          <p className={styles.subtitle}>
            El motor de aprobación es el mismo para las dos categorías; cada una puede tener sus propios desvíos condicionales. Los pasos exclusivos de Directas son la proyección de Controles, el Residente Administrativo, los comentarios y el Gerente de Compras.
          </p>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Recorrido</th>
              <th>Desvíos condicionales</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIAS.map(({ categoria, slug, detalle }) => {
              const total = aplicables(categoria).length;
              const act = activos(categoria);
              return (
                <tr key={slug} className={styles.clickableRow} onClick={() => navigate(`/configuracion/workflows/${slug}`)}>
                  <td>
                    <div className={roles.rolCell}>
                      <span className={roles.rolIcon}>
                        <GitBranch size={18} strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span className={roles.rolTexto}>
                        <span className={roles.nameText}>Solicitudes {CATEGORIA_LABELS[categoria]}s</span>
                        <span className={roles.rolTipo}>Diagrama y desvíos</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.muted}>{detalle}</span>
                  </td>
                  <td>
                    {desvios === null ? (
                      <span className={styles.muted}>—</span>
                    ) : total === 0 ? (
                      <span className={styles.muted}>Ninguno</span>
                    ) : (
                      <Badge variant={act > 0 ? 'info' : 'neutral'}>
                        {act} activo(s) de {total}
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
