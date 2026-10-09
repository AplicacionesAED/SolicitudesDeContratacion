import client, { API_BASE_URL } from './client';

function qs(params) {
  const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== 'todos');
  return clean.length ? `?${new URLSearchParams(clean)}` : '';
}

export function getHistorial(params = {}) {
  return client.get(`/actividad/historial${qs(params)}`);
}

export function getSesiones(params = {}) {
  return client.get(`/actividad/sesiones${qs(params)}`);
}

export function getStats(desde, hasta) {
  return client.get(`/actividad/stats${qs({ desde, hasta })}`);
}

// Descarga simple GET con cookie de sesión -- a diferencia de descargarDocumento
// (POST binario, necesita fetch+blob), un enlace GET normal SÍ manda la cookie
// porque es navegación de nivel superior (misma lógica de SameSite=lax que
// cualquier <a href> normal), así que basta con abrir la URL directamente.
export function urlExportarCsv(tipo, params = {}) {
  return `${API_BASE_URL}/actividad/export${qs({ tipo, formato: 'csv', ...params })}`;
}
