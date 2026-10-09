import Chart from 'react-apexcharts';
import { ChartCard } from './ChartCard.jsx';
import { CHART_AXIS_TEXT, CHART_GRID, DATA_INK } from './palette.js';
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js';

// Barra horizontal, un solo color de dato (nominal categorical: cada barra es
// una categoria distinta, no series distintas -- por eso sin leyenda, ver
// color-formula.md de la skill dataviz). Usada para departamento/sede/tipo de
// contrato/genero/salarios por empresa-gerencia-proceso: misma forma
// ("cuanto/cuantos por categoria"), la unica diferencia entre conteos y
// sumas de dinero es como se formatea el valor -- `valueFormatter` (default:
// el numero crudo, igual que antes) es esa unica diferencia.
export function CategoryBarChart({ title, hint, description, data, labelKey, valueFormatter = (value) => value }) {
  const rows = data.map((row) => ({ label: row[labelKey], total: row.total }));
  const resumen = rows.map((row) => `${row.label}: ${valueFormatter(row.total)}`).join(', ');
  const reducedMotion = usePrefersReducedMotion();

  const options = {
    chart: { type: 'bar', toolbar: { show: false }, animations: { enabled: !reducedMotion }, fontFamily: 'inherit' },
    plotOptions: { bar: { horizontal: true, barHeight: '60%', borderRadius: 4 } },
    colors: [DATA_INK],
    states: { hover: { filter: { type: 'darken', value: 0.12 } }, active: { filter: { type: 'none' } } },
    dataLabels: {
      enabled: true,
      formatter: (value) => valueFormatter(value),
      style: { colors: ['var(--color-ink)'], fontSize: '12px', fontWeight: 400 },
      offsetX: 6,
      background: { enabled: false },
    },
    xaxis: { categories: rows.map((row) => row.label), labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: CHART_AXIS_TEXT, fontSize: '12px' } } },
    grid: { borderColor: CHART_GRID, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } }, padding: { left: 8 } },
    tooltip: { theme: 'light', y: { title: { formatter: () => '' }, formatter: (value) => valueFormatter(value) } },
    legend: { show: false },
  };
  const series = [{ name: title, data: rows.map((row) => row.total) }];
  const height = Math.max(rows.length * 36 + 20, 80);

  return (
    <ChartCard title={title} hint={hint} description={description} ariaLabel={`${title}: ${resumen}`} empty={rows.length === 0}>
      <Chart options={options} series={series} type="bar" height={height} />
    </ChartCard>
  );
}
