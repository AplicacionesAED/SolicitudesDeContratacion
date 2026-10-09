import client from './client';

export function listEspecialidades() {
  return client.get('/especialidades');
}

export function createEspecialidad(data) {
  return client.post('/especialidades', data);
}

export function updateEspecialidad(id, data) {
  return client.put(`/especialidades/${id}`, data);
}

export function removeEspecialidad(id) {
  return client.delete(`/especialidades/${id}`);
}

export function importarEspecialidades(nombres) {
  return client.post('/especialidades/import', { nombres });
}
