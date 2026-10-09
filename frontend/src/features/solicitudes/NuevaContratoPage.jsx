import { SolicitudForm } from './SolicitudForm.jsx';

export function NuevaContratoPage({ categoria }) {
  return <SolicitudForm tipoSolicitud="CONTRATO" categoria={categoria} />;
}
