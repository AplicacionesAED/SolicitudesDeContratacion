import { Link } from 'react-router-dom';
import { InfoTooltip } from '../../components/ui/InfoTooltip.jsx';
import styles from './Dashboard.module.css';

// KPI del Inicio (mismo diseno que el HRMS): icono en una pastilla tintada segun `tone`
// (primary | success | warning | danger | neutral), cifra grande y etiqueta. `sub` es la linea de
// CONTEXTO bajo la etiqueta (una comparacion, un desglose, lo mas antiguo...) y `subTone`
// ('up' | 'down' | 'alert') la tine. `description`: explicacion para el InfoTooltip. `warning`: tine la
// cifra cuando requiere atencion. `to`: si se pasa, todo el KPI es un enlace; sin `to` es una tarjeta
// no clickeable (alguien sin acceso a Solicitudes ve las cifras pero no puede navegar).
// Cifras largas (ej. "$1.250 M") bajan de tamano para no partirse en dos lineas dentro de la tarjeta.
const CIFRA_LARGA = 6;

export function StatTile({ label, value, sub, subTone, description, icon: Icon, warning, tone = 'primary', to = null }) {
  const contenido = (
    <>
      <div className={styles.statTop}>
        {Icon && (
          <span className={`${styles.iconChip} ${styles[`tone_${tone}`]}`}>
            <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
        )}
        {description && <InfoTooltip text={description} />}
      </div>
      <span className={`${styles.statValue} ${String(value).length > CIFRA_LARGA ? styles.statValueLarga : ''} ${warning ? styles.statValueWarning : ''}`}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
      {sub && <span className={`${styles.statSub} ${subTone ? styles[`sub_${subTone}`] : ''}`}>{sub}</span>}
    </>
  );
  if (!to) return <div className={styles.statTile}>{contenido}</div>;
  return (
    <Link to={to} className={`${styles.statTile} ${styles.statTileLink}`}>
      {contenido}
    </Link>
  );
}
