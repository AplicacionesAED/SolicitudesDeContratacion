import Chart from 'react-apexcharts';
import { ChartCard } from './ChartCard.jsx';
import { CATEGORICAL_RAMP, NEUTRAL_SLICE, esSinDato } from './palette.js';
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js';

// Donut -- composicion nominal de pocas categorias (Genero, Tipo de
// contrato): a diferencia de CategoryBarChart (categorico, pero pensado para
// listas largas donde comparar longitudes de barra es mas facil que comparar
// angulos), un donut le gana cuando la pregunta real es "que proporcion del
// total es cada categoria" y hay pocas rebanadas (2-6) -- exactamente el caso
// de Genero/Tipo de contrato. La etiqueta central resume el total, para que
// no haga falta sumar las rebanadas a ojo.
export function DonutChart({ title, hint, description, data, labelKey }) {
  const rows = data.map((row) => ({ label: row[labelKey], total: row.total }));
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const resumen = rows.map((row) => `${row.label}: ${row.total}`).join(', ');
  const reducedMotion = usePrefersReducedMotion();

  let siguienteTono = 0;
  const colors = rows.map((row) => {
    if (esSinDato(row.label)) return NEUTRAL_SLICE;
    const color = CATEGORICAL_RAMP[siguienteTono % CATEGORICAL_RAMP.length];
    siguienteTono += 1;
    return color;
  });

  const options = {
    chart: { type: 'donut', animations: { enabled: !reducedMotion }, fontFamily: 'inherit' },
    labels: rows.map((row) => row.label),
    colors,
    stroke: { width: 3, colors: ['#fff'] },
    dataLabels: { enabled: false },
    legend: {
      position: 'right',
      fontFamily: 'inherit',
      fontSize: '12px',
      labels: { colors: 'var(--color-ink-secondary)' },
      markers: { size: 8, shape: 'circle', offsetX: -2 },
      itemMargin: { vertical: 4 },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontFamily: 'inherit',
              fontSize: '12px',
              color: 'var(--color-ink-muted)',
              formatter: () => total,
            },
            value: {
              fontFamily: 'inherit',
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--color-ink)',
            },
          },
        },
      },
    },
    states: { hover: { filter: { type: 'darken', value: 0.1 } }, active: { filter: { type: 'none' } } },
    tooltip: { theme: 'light', y: { formatter: (value) => `${value} (${total ? Math.round((value / total) * 100) : 0}%)` } },
  };
  const series = rows.map((row) => row.total);

  return (
    <ChartCard title={title} hint={hint} description={description} ariaLabel={`${title}: ${resumen}`} empty={rows.length === 0}>
      <Chart options={options} series={series} type="donut" height={220} />
    </ChartCard>
  );
}
