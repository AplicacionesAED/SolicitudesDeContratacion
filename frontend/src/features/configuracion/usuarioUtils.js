// Iniciales para el avatar (primer nombre + ultimo apellido).
export function iniciales(nombre = '') {
  const [primero, ...resto] = nombre.trim().split(/\s+/);
  return `${primero?.[0] ?? ''}${resto.length ? resto[resto.length - 1][0] : ''}`.toUpperCase() || '?';
}

// "YYYY-MM-DD" desde un timestamp ISO.
export function fmtFecha(valor) {
  return valor ? String(valor).slice(0, 10) : '—';
}

// "Nunca" si la cuenta no ha iniciado sesion; si no, fecha y hora cortas locales.
export function fmtAcceso(valor) {
  if (!valor) return null;
  return new Date(valor).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

// Descarga un CSV (con BOM para que Excel respete las tildes).
export function descargarCsv(nombre, filas) {
  const celda = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
  const contenido = '\uFEFF' + filas.map((fila) => fila.map(celda).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}
