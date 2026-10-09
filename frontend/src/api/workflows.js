import client from './client';

export function listDesvios(accion) {
  return client.get(`/workflows/desvios${accion ? `?accion=${accion}` : ''}`);
}

export function createDesvio(data) {
  return client.post('/workflows/desvios', data);
}

export function updateDesvio(id, data) {
  return client.put(`/workflows/desvios/${id}`, data);
}

export function removeDesvio(id) {
  return client.delete(`/workflows/desvios/${id}`);
}

// Acomodo manual del canvas de WorkflowDiagramaPage.jsx -- compartido entre
// todos los admins, ver workflowLayout.model.js. `getLayout` devuelve `null`
// si esa categoría todavía no tiene un acomodo guardado (el frontend cae a
// las posiciones default del código en ese caso).
export function getLayout(categoria) {
  return client.get(`/workflows/layout?categoria=${categoria}`);
}

export function saveLayout(categoria, posiciones) {
  return client.put('/workflows/layout', { categoria, posiciones });
}
