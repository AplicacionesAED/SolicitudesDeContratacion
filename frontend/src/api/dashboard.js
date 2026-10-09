import client from './client';

export function getDashboardStats() {
  return client.get('/dashboard/stats');
}

export function getDashboardRecientes(limit = 10) {
  return client.get(`/dashboard/recientes?limit=${limit}`);
}

// Resumen completo del Inicio (KPIs con contexto, lo que requiere atencion, graficos y recientes).
// `categoria`: 'DIRECTA' | 'INDIRECTA' | null (todas).
export function getDashboardResumen(categoria = null) {
  return client.get(`/dashboard/resumen${categoria ? `?categoria=${categoria}` : ''}`);
}
