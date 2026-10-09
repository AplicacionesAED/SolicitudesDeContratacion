import client from './client';

export function listarNotificaciones() {
  return client.get('/notificaciones');
}

export function marcarLeida(id) {
  return client.patch('/notificaciones', { id });
}

export function marcarTodasLeidas() {
  return client.patch('/notificaciones', { all: true });
}
