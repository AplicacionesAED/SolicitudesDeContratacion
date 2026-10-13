// Nueva solicitud (rediseno 2026-10-09). Era un picker pelado de 3-4 tarjetas. Problemas reales que se corrigen:
//  - En Solicitudes DIRECTAS todo es Orden de Servicio y las ordenes no admiten otrosi: las tarjetas de otrosi llevaban
//    a un buscador que SIEMPRE salia vacio (OtrosiForm descarta las ordenes de servicio). Ahora aparecen deshabilitadas
//    con la razon, en vez de un callejon sin salida.
//  - No se sabia que hacia falta para cada tipo: cada tarjeta lista lo que vas a necesitar.
//  - Los borradores propios quedaban perdidos: ahora se ofrecen para continuarlos.
//  - "Importar registro historico" solo se alcanzaba desde la lista: ahora tambien desde aqui.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, FileSignature, CalendarClock, FilePen, History, Ban } from 'lucide-react';
import { listSolicitudes } from '../../api/solicitudes.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { categoriaSlug, CATEGORIA_LABELS, TIPO_SOLICITUD_LABELS, formatCurrency } from '../../utils/solicitudes.js';
import styles from '../configuracion/Usuarios.module.css';
import n from './Nueva.module.css';

const TIPOS = [
  {
    slug: 'contrato',
    titulo: 'Contrato',
    icono: FileSignature,
    desc: 'Contratación de obra, diseño o servicios con un tercero.',
    necesitas: ['Frente(s) de trabajo', 'Contratista aprobado', 'Cuadro comparativo y cotización', 'Cronograma'],
    soloIndirecta: true,
  },
  {
    slug: 'orden-servicio',
    titulo: 'Orden de Servicio',
    icono: ClipboardList,
    desc: 'Servicios puntuales de menor alcance que un contrato.',
    necesitas: ['Frente(s) de trabajo', 'Contratista aprobado', 'Cuadro comparativo y cotización'],
  },
  {
    slug: 'otrosi-tiempo',
    titulo: 'Otrosí por Tiempo',
    icono: CalendarClock,
    desc: 'Extiende el plazo de un contrato ya completado.',
    necesitas: ['Un contrato completado', 'Nueva fecha de fin en el cronograma'],
    otrosi: true,
  },
  {
    slug: 'otrosi-tiempo-cantidad',
    titulo: 'Otrosí Tiempo, Cantidad y/o Modificación',
    icono: FilePen,
    desc: 'Extiende el plazo y/o modifica el valor de un contrato completado.',
    necesitas: ['Un contrato completado', 'Nuevo valor (si cambia)', 'Nueva fecha de fin en el cronograma'],
    otrosi: true,
  },
];

export function NuevaSolicitudTipoPage({ categoria }) {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const slug = categoriaSlug(categoria);
  const base = `/solicitudes-${slug}/nueva`;
  const tipos = TIPOS.filter((t) => !t.soloIndirecta || categoria !== 'DIRECTA');
  const [borradores, setBorradores] = useState([]);

  useEffect(() => {
    listSolicitudes({ categoria })
      .then((res) => setBorradores(res.data.filter((s) => s.estado === 'BORRADOR' && s.solicitanteId === Number(usuario?.id))))
      .catch(() => setBorradores([]));
  }, [categoria, usuario?.id]);

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Nueva solicitud {CATEGORIA_LABELS[categoria]?.toLowerCase()}</h1>
        <p className={styles.subtitle}>Elige qué quieres crear. Puedes guardar un borrador en cualquier momento y continuar después.</p>
      </div>

      {borradores.length > 0 && (
        <section className={styles.sectionCard}>
          <div>
            <h2 className={styles.sectionTitle}>Continúa un borrador</h2>
            <p className={styles.sectionHint}>Tienes {borradores.length} borrador{borradores.length === 1 ? '' : 'es'} sin enviar.</p>
          </div>
          <ul className={n.borradores}>
            {borradores.slice(0, 5).map((b) => (
              <li key={b.id}>
                <Link to={`/solicitudes/${b.id}/editar`} className={n.borrador}>
                  <span className={n.borradorId}>{b.consecutivo}</span>
                  <span className={n.borradorInfo}>{TIPO_SOLICITUD_LABELS[b.tipo] ?? b.tipo}{b.tercero ? ` · ${b.tercero.razonSocial}` : ' · sin contratista'}</span>
                  <span className={n.borradorValor}>{b.valorFinal ? formatCurrency(b.valorFinal) : ''}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={n.grid}>
        {tipos.map((t) => {
          const Icono = t.icono;
          const bloqueado = categoria === 'DIRECTA' && t.otrosi;
          return (
            <button key={t.slug} type="button" className={`${n.card} ${bloqueado ? n.cardBloqueada : ''}`} disabled={bloqueado} onClick={() => navigate(`${base}/${t.slug}`)}>
              <span className={n.icono}>{bloqueado ? <Ban size={22} aria-hidden="true" /> : <Icono size={22} aria-hidden="true" />}</span>
              <span className={n.titulo}>{t.titulo}</span>
              <span className={n.desc}>{t.desc}</span>
              {bloqueado ? (
                <span className={n.nota}>No disponible en Solicitudes Directas: las órdenes de servicio no admiten otrosí.</span>
              ) : (
                <>
                  <span className={n.necesitasTitulo}>Vas a necesitar</span>
                  <ul className={n.necesitas}>
                    {t.necesitas.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </>
              )}
            </button>
          );
        })}
      </div>

      <Link to={`/solicitudes-${slug}/importar-historico`} className={n.historico}>
        <History size={16} aria-hidden="true" /> ¿Es un contrato u orden anterior a este sistema? Impórtalo como registro histórico
      </Link>
    </div>
  );
}
