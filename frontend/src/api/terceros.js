import client from './client';

export function listTerceros(aprobado) {
  return client.get(`/terceros${aprobado !== undefined ? `?aprobado=${aprobado}` : ''}`);
}

export function getTercero(id) {
  return client.get(`/terceros/${id}`);
}

export function createTercero(data) {
  return client.post('/terceros', data);
}

export function updateTercero(id, data) {
  return client.patch(`/terceros/${id}`, data);
}

export function removeTercero(id) {
  return client.delete(`/terceros/${id}`);
}

export function sincronizarSharePoint() {
  return client.post('/terceros/sync-sharepoint');
}
