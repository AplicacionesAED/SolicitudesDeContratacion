/**
 * Calcula el número de secuencia de un otrosí nuevo a partir de los
 * numeroOtrosi ya registrados para su padre (otrosís nativos creados por la
 * app, y otrosís históricos registrados por importación). Ignora entradas
 * null/undefined — corresponden a otrosís creados antes de que este campo
 * existiera, o sin número histórico conocido.
 */
export function nextNumeroOtrosi(existing: (number | null | undefined)[]): number {
  const known = existing.filter((n): n is number => typeof n === "number");
  if (known.length === 0) return 1;
  return Math.max(...known) + 1;
}
