import client from './client';

export function listRoles() {
  return client.get('/roles');
}

// Puerto de Cartera, 2026-09-18, pedido explicito del usuario -- "quiero
// poder crear roles". Backend ya lo soportaba (rol.routes.js#POST /), solo
// faltaba el lado del frontend.
export function createRol(data) {
  return client.post('/roles', data);
}

export function updateRol(nombre, data) {
  return client.put(`/roles/${nombre}`, data);
}

export function listFuncionalidadesDisponibles() {
  return client.get('/roles/funcionalidades-disponibles');
}
