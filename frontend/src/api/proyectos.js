import client from './client';

export function listProyectos(includeInactive = true) {
  return client.get(`/proyectos${includeInactive ? '?includeInactive=true' : ''}`);
}

export function createProyecto(data) {
  return client.post('/proyectos', data);
}

export function updateProyecto(id, data) {
  return client.put(`/proyectos/${id}`, data);
}
