// No usa el cliente compartido (client.js) a propósito: ese wrapper fuerza
// `Content-Type: application/json` en cualquier request con body, lo que
// rompe un multipart/form-data (el navegador necesita fijar el boundary él
// mismo) -- mismo motivo por el que api/solicitudes.js#descargarArchivo hace
// su propio fetch en vez de pasar por client.js.
import { API_BASE_URL } from './client';

export async function subirArchivo(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', credentials: 'include', body: formData });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? 'Error al subir el archivo');
  return body.data;
}
