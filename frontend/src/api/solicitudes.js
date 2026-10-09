import client, { API_BASE_URL } from './client';

export function listSolicitudes(filtros = {}) {
  const params = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ''));
  const qs = params.toString();
  return client.get(`/solicitudes${qs ? `?${qs}` : ''}`);
}

export function getSolicitud(id) {
  return client.get(`/solicitudes/${id}`);
}

export function createSolicitud(data) {
  return client.post('/solicitudes', data);
}

export function updateSolicitud(id, data) {
  return client.patch(`/solicitudes/${id}`, data);
}

export function removeSolicitud(id) {
  return client.delete(`/solicitudes/${id}`);
}

export function cambiarEstado(id, accion, extra = {}) {
  return client.post(`/solicitudes/${id}/estado`, { accion, ...extra });
}

// Finaliza un registro histórico (importadoHistorico=true) que nació como
// BORRADOR -- el equivalente a "Enviar", pero salta directo a COMPLETADA sin
// pasar por la máquina de aprobaciones (nunca hay quién apruebe algo que ya
// ocurrió). Ver SolicitudForm.jsx#esHistorico.
export function completarHistorico(id) {
  return client.post(`/solicitudes/${id}/completar-historico`);
}

export function importarHistorico(payload) {
  return client.post('/solicitudes/importar-historico', payload);
}

export function guardarCronograma(solicitudId, cronograma) {
  return client.post(`/solicitudes/${solicitudId}/cronograma`, cronograma);
}

export function guardarCuadroComparativo(solicitudId, cuadroComparativo) {
  return client.post(`/solicitudes/${solicitudId}/cuadro-comparativo`, cuadroComparativo);
}

export function guardarMemoria(solicitudId, memoria) {
  return client.post(`/solicitudes/${solicitudId}/memoria`, memoria);
}

// Descargas autenticadas: fetch + blob + un <a download> temporal, en vez de
// un <a href> plano -- el backend exige la cookie de sesión, y un link común
// no manda credenciales cross-origin igual que un fetch con
// `credentials: 'include'`.
async function descargarArchivo(path, options, nombreArchivoFallback) {
  const res = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? 'Error al generar el archivo');
  }
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="(.+)"/);
  const nombreArchivo = match?.[1] ?? nombreArchivoFallback;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function descargarDocumento(solicitudId) {
  return descargarArchivo(`/solicitudes/${solicitudId}/documento`, { method: 'POST' }, `Solicitud-${solicitudId}.docx`);
}

// PDF "Orden de Compra/Servicios" -- SOLO para Directa (pedido explícito
// del usuario, "de momento solo aplícalo en directos"), ver ordenServicio.js
// (backend). El botón "Generar documento" de SolicitudDetallePage.jsx
// llama a esta función o a descargarDocumento() según
// `solicitud.categoria`.
export function descargarOrdenServicio(solicitudId) {
  return descargarArchivo(`/solicitudes/${solicitudId}/orden-servicio`, { method: 'POST' }, `Orden de Servicio ${solicitudId}.pdf`);
}

export function descargarCronogramaExport(cronograma) {
  return descargarArchivo(
    '/solicitudes/cronograma/export',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cronograma) },
    'cronograma.xlsx'
  );
}
