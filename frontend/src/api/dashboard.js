import client from './client';

export function getDashboardStats() {
  return client.get('/dashboard/stats');
}

export function getDashboardRecientes(limit = 10) {
  return client.get(`/dashboard/recientes?limit=${limit}`);
}
