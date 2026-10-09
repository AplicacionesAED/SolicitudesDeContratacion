import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSolicitud } from '../../api/solicitudes.js';
import { SolicitudForm } from './SolicitudForm.jsx';

export function EditarSolicitudPage() {
  const { id } = useParams();
  const [solicitud, setSolicitud] = useState(null);

  useEffect(() => {
    getSolicitud(id).then((res) => setSolicitud(res.data));
  }, [id]);

  if (!solicitud) return null;
  return <SolicitudForm tipoSolicitud={solicitud.tipo} categoria={solicitud.categoria} isEdit initialData={solicitud} />;
}
