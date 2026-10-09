// Puerto literal de src/lib/otrosi.ts.
function nextNumeroOtrosi(existing) {
  const known = existing.filter((n) => typeof n === 'number');
  if (known.length === 0) return 1;
  return Math.max(...known) + 1;
}

// Elige, entre los otrosís COMPLETADOS de un mismo padre, cuál es la línea
// base vigente (el valor/cronograma que hereda el próximo otrosí). No puede
// ordenarse solo por fecha de creación: los otrosís históricos se importan
// todos "hoy" en cualquier orden, así que la posición lógica real es
// numeroOtrosi -- creadoEn solo desempata entre registros sin numeroOtrosi
// conocido.
function pickMostRecentOtrosi(candidates) {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    const an = a.numero_otrosi ?? -1;
    const bn = b.numero_otrosi ?? -1;
    if (an !== bn) return bn - an;
    return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime();
  })[0];
}

module.exports = { nextNumeroOtrosi, pickMostRecentOtrosi };
