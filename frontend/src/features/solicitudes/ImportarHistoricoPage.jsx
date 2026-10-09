// 2026-09-25, pedido explícito del usuario (corrección de la primera
// versión): esta pantalla es SOLO para importar un Contrato u Orden de
// Servicio histórico -- ya no pregunta Directa/Indirecta (llega como prop de
// la ruta, `/solicitudes-directas|indirectas/importar-historico`, mismo
// patrón que NuevaContratoPage/NuevaOrdenServicioPage con "Nueva solicitud")
// y ya no ofrece Otrosí ni los 5 tipos de Trámite viejo -- ver
// ImportarOtrosiHistoricoPage.jsx para esos dos casos (pantalla aparte,
// sigue viviendo en /solicitudes/importar-historico, enlazada desde
// OtrosiForm.jsx). Una vez elegido Contrato/Orden de Servicio, esta página
// se reemplaza por completo por el mismo SolicitudForm.jsx que usa la
// creación en vivo (historico=true) -- ya se adapta solo a Directa/Indirecta
// (secciones, tipos de contrato, Cronograma solo Indirecta, Memoria solo
// Directa, etc.), nada de eso se reimplementa acá.
import { useState } from 'react';
import { SolicitudForm } from './SolicitudForm.jsx';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { categoriaSlug } from '../../utils/solicitudes.js';
import styles from './Solicitudes.module.css';

// Mismo candado que NuevaSolicitudTipoPage.jsx -- en Directa ya no existe el
// tipo "Contrato" (solo Orden de Servicio, con el mismo formato).
const TIPOS = [
  { tipo: 'CONTRATO', titulo: 'Contrato', desc: 'Contratación de obra, diseño o servicios con un tercero.', soloIndirecta: true },
  { tipo: 'ORDEN_SERVICIO', titulo: 'Orden de Servicio', desc: 'Servicios puntuales de menor alcance que un contrato.' },
];

export function ImportarHistoricoPage({ categoria }) {
  const [tipo, setTipo] = useState('');

  // Reemplaza TODA la página por el formulario completo, igual que crear una
  // solicitud nueva -- para cambiar de tipo, "Solicitudes" (BackLink del
  // propio SolicitudForm) vuelve al listado, mismo patrón que al crear.
  if (tipo) return <SolicitudForm tipoSolicitud={tipo} categoria={categoria} historico />;

  const opciones = TIPOS.filter((t) => !t.soloIndirecta || categoria !== 'DIRECTA');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <BackLink to={`/solicitudes-${categoriaSlug(categoria)}`}>Solicitudes</BackLink>
      <div>
        <h1 className={styles.title}>Importar registro histórico</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--color-ink-muted)' }}>
          Registra un contrato u orden de servicio anterior a este sistema, ya completado, con la misma información que una solicitud real.
        </p>
      </div>
      <div className={styles.tipoPicker}>
        {opciones.map((t) => (
          <button key={t.tipo} type="button" className={styles.tipoCard} onClick={() => setTipo(t.tipo)}>
            <span className={styles.tipoCardTitle}>{t.titulo}</span>
            <span className={styles.tipoCardDesc}>{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
