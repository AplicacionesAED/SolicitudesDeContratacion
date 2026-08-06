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

interface OtrosiBaselineCandidate {
  numeroOtrosi: number | null;
  creadoEn: Date;
}

/**
 * Elige, entre los otrosís completados de un mismo padre, cuál representa la
 * línea base vigente (el valor/cronograma que debe heredar el próximo
 * otrosí). No puede ordenarse solo por fecha de creación: los otrosís
 * históricos se importan todos "hoy", en cualquier orden, así que la
 * posición lógica real es numeroOtrosi. Usa creadoEn solo como desempate
 * entre registros sin numeroOtrosi conocido.
 */
export function pickMostRecentOtrosi<T extends OtrosiBaselineCandidate>(candidates: T[]): T | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    const an = a.numeroOtrosi ?? -1;
    const bn = b.numeroOtrosi ?? -1;
    if (an !== bn) return bn - an;
    return b.creadoEn.getTime() - a.creadoEn.getTime();
  })[0];
}
