import { SolicitudForm } from './SolicitudForm.jsx';

export function NuevaOrdenServicioPage({ categoria }) {
  return <SolicitudForm tipoSolicitud="ORDEN_SERVICIO" categoria={categoria} />;
}
