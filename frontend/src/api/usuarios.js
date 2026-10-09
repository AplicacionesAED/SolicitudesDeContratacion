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

// Elimina la cuenta de verdad (solo si esta inactiva y sin registros asociados). Irreversible.
export function removeUsuarioDefinitivo(id) {
  return client.delete(`/usuarios/${id}/definitivo`);
}

export function getUsuario(id) {
  return client.get(`/usuarios/${id}`);
}

// Genera y GUARDA una contrasena temporal nueva (se devuelve una sola vez).
export function generarPasswordUsuario(id) {
  return client.post(`/usuarios/${id}/generar-password`);
}

// Acciones sobre varias cuentas a la vez: 'generar-password' | 'activar' | 'inactivar'.
export function accionMasivaUsuarios(ids, accion) {
  return client.post('/usuarios/masivo', { ids, accion });
}
