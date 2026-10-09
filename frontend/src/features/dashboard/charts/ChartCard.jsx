import { InfoTooltip } from '../../../components/ui/InfoTooltip.jsx';
import styles from '../Dashboard.module.css';

// Envoltorio comun: titulo + hint + el grafico + estado vacio.
//
// El resumen en texto plano va en un <p> visualmente oculto (.srOnly), NO
// como aria-label en un div con role="img" envolviendo el grafico: role="img"
// le dice al lector de pantalla "esto es una imagen estatica" y saca todo lo
// de adentro del arbol de accesibilidad -- incluido el tooltip interactivo de
// ApexCharts, que deja de ser alcanzable. El grafico real queda sin role
// especial (interactivo, tabulable); el resumen es un texto hermano.
export function ChartCard({ title, hint, description, ariaLabel, empty, wide, children }) {
  return (
    <div className={`${styles.chartCard} ${wide ? styles.chartCardWide : ''}`}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleRow}>
          <h3 className={styles.chartTitle}>{title}</h3>
          {description && <InfoTooltip text={description} />}
        </div>
        {hint && <p className={styles.chartHint}>{hint}</p>}
      </div>
      {empty ? (
        <p className={styles.emptyHint}>Sin datos todavía.</p>
      ) : (
        <>
          <p className={styles.srOnly}>{ariaLabel}</p>
          {children}
        </>
      )}
    </div>
  );
}
