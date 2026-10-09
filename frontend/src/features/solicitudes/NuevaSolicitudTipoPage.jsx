// Puerto simplificado de (app)/solicitudes/nueva/page.tsx -- un picker de
// tipo antes de entrar al wizard real. Los 4 tipos que cubre esta migración
// (ver el plan de Fase 4); los 5 tipos de "trámite" (TRAMITE_CUENTA, etc.)
// existen en el backend/consecutivo pero no tienen wizard propio todavía.
import { useNavigate } from 'react-router-dom';
import { categoriaSlug } from '../../utils/solicitudes.js';
import styles from './Solicitudes.module.css';

const SUBRUTAS = [
  // Pedido explícito del usuario (2026-09-17): en Directa ya no existe el
  // tipo "Contrato" -- solo Orden de Servicio (con el mismo formato de
  // Contrato, ver esa sección en CLAUDE.md). `soloIndirecta: true` filtra
  // esta card para DIRECTA sin duplicar el array entero.
  { slug: 'contrato', titulo: 'Contrato', desc: 'Contratación de obra, diseño o servicios con un tercero.', soloIndirecta: true },
  { slug: 'orden-servicio', titulo: 'Orden de Servicio', desc: 'Servicios puntuales de menor alcance que un contrato.' },
  { slug: 'otrosi-tiempo', titulo: 'Otrosí por Tiempo', desc: 'Extiende el plazo de un contrato ya completado.' },
  { slug: 'otrosi-tiempo-cantidad', titulo: 'Otrosí Tiempo, Cantidad y/o Modificación', desc: 'Extiende plazo y/o modifica el valor de un contrato completado.' },
];

export function NuevaSolicitudTipoPage({ categoria }) {
  const navigate = useNavigate();
  const base = `/solicitudes-${categoriaSlug(categoria)}/nueva`;
  const subrutas = SUBRUTAS.filter((t) => !t.soloIndirecta || categoria !== 'DIRECTA');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <h1 className={styles.title}>Nueva solicitud</h1>
      <p style={{ color: 'var(--color-ink-muted)', margin: 0 }}>Selecciona el tipo de solicitud que quieres crear.</p>
      <div className={styles.tipoPicker}>
        {subrutas.map((t) => (
          <button key={t.slug} type="button" className={styles.tipoCard} onClick={() => navigate(`${base}/${t.slug}`)}>
            <span className={styles.tipoCardTitle}>{t.titulo}</span>
            <span className={styles.tipoCardDesc}>{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
