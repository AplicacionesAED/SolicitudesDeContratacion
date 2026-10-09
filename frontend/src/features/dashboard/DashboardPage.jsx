// Puerto de (app)/dashboard/page.tsx -- en el original era la página
// efectiva de aterrizaje tras el login (no había una page.tsx separada en
// (app)/, solo (app)/dashboard/), así que acá ocupa el mismo lugar: la ruta
// índice "/" (ver App.jsx), reemplazando el placeholder de InicioPage.jsx de
// las Fases 0-6. Los 4 KPIs ya cumplen la regla de "máximo 5 en una sola
// grilla" de ARQUITECTURA-FRONTEND.md tal cual estaban en el original, sin
// necesidad de fusionar/cortar ninguno.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Clock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { usuarioTienePermiso } from '../../utils/permisos.js';
import { getDashboardStats, getDashboardRecientes } from '../../api/dashboard.js';
import { TIPO_SOLICITUD_LABELS } from '../../utils/solicitudes.js';
import { SolicitudBadge } from '../solicitudes/SolicitudBadge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import styles from './Dashboard.module.css';

// `to === null` (sin acceso de VER a ninguna categoría) renderiza la misma
// tarjeta sin envolverla en <Link> -- antes estos 4 KPIs apuntaban siempre a
// /solicitudes-indirectas sin importar el permiso real del usuario, así que
// alguien sin acceso a Solicitudes veía igual las 4 tarjetas y, al hacer
// clic, `ProtectedRoute` lo rebotaba en silencio a "/" -- el bug real detrás
// de "le quito el acceso a todo pero le sigue mostrando todo" (2026-09-02).
function StatCard({ label, value, icon: Icon, colorClass, to }) {
  const contenido = (
    <>
      <span className={`${styles.statIcon} ${colorClass}`}>
        <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div>
        <p className={styles.statValue}>{value}</p>
        <p className={styles.statLabel}>{label}</p>
      </div>
    </>
  );
  if (!to) return <div className={styles.statCard} aria-disabled="true" style={{ opacity: 0.6, cursor: 'default' }}>{contenido}</div>;
  return (
    <Link to={to} className={styles.statCard}>
      {contenido}
    </Link>
  );
}

function formatFecha(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function DashboardPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recientes, setRecientes] = useState(null);

  useEffect(() => {
    getDashboardStats().then((res) => setStats(res.data));
    getDashboardRecientes(10).then((res) => setRecientes(res.data));
  }, []);

  // 2026-09-02: los 4 KPIs (y "Nueva solicitud"/"Ver todas") apuntaban
  // siempre a /solicitudes-indirectas sin mirar el permiso real -- alguien
  // sin acceso a NINGUNA categoría igual veía las 4 tarjetas clickeables y,
  // al hacer clic, `ProtectedRoute` lo rebotaba en silencio a "/" (bug real
  // detrás de "le quito el acceso a todo pero le sigue mostrando todo").
  // Se prefiere Indirecta cuando el usuario tiene acceso a ambas (mismo
  // default que ya tenía el link hardcodeado); si no tiene ninguna, el link
  // es `null` y `StatCard`/los botones dejan de ser clickeables.
  const linkVerTodas = usuarioTienePermiso(usuario, 'ver_solicitudes_indirectas')
    ? '/solicitudes-indirectas'
    : usuarioTienePermiso(usuario, 'ver_solicitudes_directas')
      ? '/solicitudes-directas'
      : null;
  const linkNueva = usuarioTienePermiso(usuario, 'crear_solicitudes_indirectas')
    ? '/solicitudes-indirectas/nueva'
    : usuarioTienePermiso(usuario, 'crear_solicitudes_directas')
      ? '/solicitudes-directas/nueva'
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard — Baía Kristal</h1>
        <p className={styles.subtitle}>Bienvenido, {usuario?.nombre}</p>
      </div>

      <div className={styles.statsGrid}>
        {/* Los 4 KPIs siguen sin distinguir categoría (mezclan directas +
            indirectas) -- fuera de alcance de Solicitudes Directas, ver el
            plan. El link real (`linkVerTodas`) sí respeta el permiso del
            usuario -- ver el comentario en el cuerpo del componente. */}
        <StatCard label="Total solicitudes activas" value={stats?.totalActivas ?? '—'} icon={FileText} colorClass={styles.statIconBlue} to={linkVerTodas} />
        <StatCard label="Pendientes de mi aprobación" value={stats?.pendientesMiAprobacion ?? '—'} icon={Clock} colorClass={styles.statIconYellow} to={linkVerTodas} />
        <StatCard label="En revisión / devueltas" value={stats?.enRevision ?? '—'} icon={AlertCircle} colorClass={styles.statIconRed} to={linkVerTodas} />
        <StatCard label="Completadas este mes" value={stats?.completadasEsteMes ?? '—'} icon={CheckCircle2} colorClass={styles.statIconGreen} to={linkVerTodas} />
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Solicitudes recientes</h2>
          {linkVerTodas && (
            <Link to={linkVerTodas} className={styles.verTodas}>
              Ver todas
              <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          )}
        </div>

        {recientes && recientes.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={28} strokeWidth={1.5} aria-hidden="true" />
            <p style={{ fontWeight: 500, color: 'var(--color-ink)' }}>No hay solicitudes aún</p>
            <p>Crea tu primera solicitud para comenzar el flujo de aprobación.</p>
            {linkNueva && (
              <Button type="button" style={{ marginTop: 8 }} onClick={() => navigate(linkNueva)}>
                Nueva solicitud
              </Button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Consecutivo</th>
                  <th>Tipo</th>
                  <th>Frente</th>
                  <th>Tercero</th>
                  <th>N° ADPRO</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {(recientes ?? []).map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/solicitudes/${s.id}`} className={styles.consecutivoLink}>{s.consecutivo}</Link>
                    </td>
                    <td>{TIPO_SOLICITUD_LABELS[s.tipo] ?? s.tipo}</td>
                    <td>
                      {s.frentesNombres.length > 0 ? (
                        <>
                          {s.frentesNombres[0]}
                          {s.frentesNombres.length > 1 && <span style={{ color: 'var(--color-ink-muted)', marginLeft: 4 }}>+{s.frentesNombres.length - 1}</span>}
                        </>
                      ) : '—'}
                    </td>
                    <td>{s.terceroRazonSocial ?? '—'}</td>
                    <td>{s.numeroContratoAdpro ? <span style={{ fontFamily: 'monospace' }}>{s.numeroContratoAdpro}</span> : <span style={{ color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>—</span>}</td>
                    <td><SolicitudBadge estado={s.estado} /></td>
                    <td>{formatFecha(s.fechaSolicitud)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
