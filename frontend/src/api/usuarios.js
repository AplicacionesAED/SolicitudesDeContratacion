// PLANTILLA -- base copiable, va en frontend/src/api/usuarios.js.
import client from './client';

export function listUsuarios() {
  return client.get('/usuarios');
}

export function createUsuario(data) {
  return client.post('/usuarios', data);
}

export function updateUsuario(id, data) {
  return client.put(`/usuarios/${id}`, data);
}

export function removeUsuario(id) {
  return client.delete(`/usuarios/${id}`);
}
