// Paleta de graficos derivada del propio tonal ramp de "primary" de la marca
// (ver .impeccable/design.json), validada con la skill de dataviz
// (node scripts/validate_palette.js ... --ordinal --surface "#FFFFFF" -> ALL CHECKS PASS).
//
// Ninguna grafica de este dashboard combina series distintas a la vez (todas
// son una sola serie: conteo por categoria o una tendencia), asi que no hace
// falta una paleta categorica de 8 tonos -- un solo color de dato alcanza.
//
// DATA_INK es el Azul Vibrante literal (#232BED) desde 2026-10-01 -- antes
// era un escalon mas oscuro del ramp (#1B21A6) a proposito, para no comerse
// el presupuesto de la Rationed Brand Rule de DESIGN.md (entonces <=10% de
// pantalla). Esa regla subio a ~20% (pedido explicito del usuario: "mas
// colores" en los KPIs y las tarjetas de grafico), y el presupuesto extra se
// gasto justo en esto -- el token vibrante real ya no hacia falta esquivarlo.
// DATA_INK_ACTIVE se elimino: quedaba identico a DATA_INK y nunca se
// importaba desde ningun lado (CategoryBarChart.jsx ya resolvia el estado
// hover con un filtro `darken` generico, no referenciando este token).
export const DATA_INK = '#232BED';

// Ramp ordinal de 4 pasos, reutilizado por cualquier grafico de buckets donde
// el ORDEN si importa (claro = extremo bajo, oscuro = extremo alto) -- hoy
// Antiguedad (anios de servicio) y Distribucion salarial (rango de
// salario_base), ver OrdinalBarChart.jsx.
export const ORDINAL_RAMP = ['#7B80F5', '#232BED', '#1B21A6', '#12175E'];

// Ramp categorico (el orden NO importa, cada tramo es una categoria nominal
// distinta) -- mismos 4 tonos del ramp ordinal, reordenados para que dos
// tramos adyacentes en un donut nunca queden con tonos consecutivos del
// ramp (que si se leerian como "una escala"). Usado por DonutChart.jsx
// (Genero, Tipo de contrato).
export const CATEGORICAL_RAMP = ['#232BED', '#20A7A1', '#7B80F5', '#12175E', '#22C16A'];

// "Sin especificar"/"Sin asignar" (un dato que falta, no una categoria real)
// se pinta con este gris neutro en vez del siguiente tono del ramp -- ver
// categoricalColor() abajo. Nunca cuenta como parte del presupuesto de la
// Rationed Brand Rule (no es color de marca).
export const NEUTRAL_SLICE = 'var(--color-border-strong)';

export function esSinDato(label) {
  return label === 'Sin especificar' || label === 'Sin asignar';
}

export const CHART_GRID = 'var(--color-border)';
export const CHART_AXIS_TEXT = 'var(--color-ink-muted)';
