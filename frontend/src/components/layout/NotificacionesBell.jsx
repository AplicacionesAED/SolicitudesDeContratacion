// Campana de notificaciones con el mismo diseno que la del HRMS (migracion de diseno
// 2026-10-09): contador sobre la campana, panel con titulo + "Marcar todas como leidas",
// pestanas Todas / Sin leer, items con icono por tipo, hora relativa y punto de "sin leer".
// Lo propio de Solicitudes se conserva: el badge de no leidas llega en vivo por SSE (en vez
// del polling del HRMS) y cada item marca como leida y navega a la solicitud.
//
// El backend esta en otro origen (:3021 vs :5193 en dev), asi que hace falta la URL absoluta
// + `withCredentials: true` para que la cookie de sesion httpOnly viaje con la conexion SSE.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, ClipboardList, XCircle } from 'lucide-react';
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from '../../api/notificaciones.js';
import { API_BASE_URL } from '../../api/client.js';
import styles from './NotificacionesBell.module.css';

const TABS = [
  { key: 'todas', label: 'Todas' },
  { key: 'sin-leer', label: 'Sin leer' },
];

function haceCuanto(iso) {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'Ayer' : `Hace ${dias} días`;
}

// Icono segun el titulo que genera el backend (notificacion.service.js): lo que devuelve o
// anula una solicitud llama la atencion (rojo), lo aprobado/completado es positivo (verde) y
// el resto -- pendientes de tu decision, nuevas en tramite, comentarios -- es informativo.
function tipoDe(notif) {
  if (/devuelt|anulad|requiere revisi/i.test(notif.titulo)) return 'rechazo';
  if (/aprobad|completad/i.test(notif.titulo)) return 'ok';
  return 'info';
}

const ICONO_POR_TIPO = {
  rechazo: { Icono: XCircle, clase: 'iconoRechazo' },
  ok: { Icono: CheckCircle2, clase: 'iconoOk' },
  info: { Icono: ClipboardList, clase: 'iconoInfo' },
};

export function NotificacionesBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('todas');
  const [notificaciones, setNotificaciones] = useState([]);
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [pulso, setPulso] = useState(false);

  const containerRef = useRef(null);
  const prevCountRef = useRef(0);

  const cargar = useCallback(async () => {
    try {
      const res = await listarNotificaciones();
      setNotificaciones((res.data?.notificaciones ?? []).slice(0, 10));
      setTotalNoLeidas(res.data?.totalNoLeidas ?? 0);
      prevCountRef.current = res.data?.totalNoLeidas ?? 0;
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    cargar();

    let es;
    let retryTimeout;

    function connect() {
      es = new EventSource(`${API_BASE_URL}/notificaciones/stream`, { withCredentials: true });

      es.onmessage = (event) => {
        try {
          const { totalNoLeidas: nuevoConteo } = JSON.parse(event.data);
          if (nuevoConteo > prevCountRef.current) {
            cargar();
            setPulso(true);
            setTimeout(() => setPulso(false), 2000);
          }
          setTotalNoLeidas(nuevoConteo);
          prevCountRef.current = nuevoConteo;
        } catch {
          // ignorar mensajes malformados
        }
      };

      es.onerror = () => {
        es.close();
        retryTimeout = setTimeout(connect, 15_000);
      };
    }

    connect();

    return () => {
      es?.close();
      clearTimeout(retryTimeout);
    };
  }, [cargar]);

  function closeIfFocusLeft(event) {
    if (!containerRef.current?.contains(event.relatedTarget)) setOpen(false);
  }

  async function handleClick(notif) {
    if (!notif.leida) {
      try {
        await marcarLeida(notif.id);
        setNotificaciones((prev) => prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n)));
        setTotalNoLeidas((c) => {
          const next = Math.max(0, c - 1);
          prevCountRef.current = next;
          return next;
        });
      } catch {
        // ignore
      }
    }
    setOpen(false);
    if (notif.url) navigate(notif.url);
  }

  async function handleMarcarTodas() {
    try {
      await marcarTodasLeidas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setTotalNoLeidas(0);
      prevCountRef.current = 0;
    } catch {
      // ignore
    }
  }

  const visibles = tab === 'sin-leer' ? notificaciones.filter((n) => !n.leida) : notificaciones;
  const mensajeVacio = tab === 'sin-leer' ? 'No tienes notificaciones sin leer.' : 'No tienes notificaciones pendientes.';

  return (
    <div ref={containerRef} className={styles.container} onBlurCapture={closeIfFocusLeft}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Notificaciones${totalNoLeidas > 0 ? ` (${totalNoLeidas} sin leer)` : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
        {totalNoLeidas > 0 && <span className={`${styles.count} ${pulso ? styles.countPulse : ''}`}>{totalNoLeidas > 9 ? '9+' : totalNoLeidas}</span>}
      </button>

      {open && (
        <div className={styles.panel} role="menu">
          <div className={styles.panelHeader}>
            <div className={styles.panelTitulo}>
              <span>Notificaciones</span>
              {totalNoLeidas > 0 && <span className={styles.contador}>{totalNoLeidas}</span>}
            </div>
            {totalNoLeidas > 0 && (
              <button type="button" className={styles.readAll} onClick={handleMarcarTodas}>
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className={styles.tabs} role="tablist" aria-label="Filtrar notificaciones">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* data-lenis-prevent -- el <ReactLenis> de AppShell.jsx captura el wheel sobre toda el
              area de scroll; sin esto, hacer scroll sobre esta lista mueve la pagina de fondo. */}
          <div className={styles.cuerpo} data-lenis-prevent>
            {visibles.length === 0 ? (
              <div className={styles.vacio}>
                <span className={styles.vacioIcono}>
                  <Bell size={22} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <strong>Estás al día</strong>
                <span>{mensajeVacio}</span>
              </div>
            ) : (
              <section className={styles.grupo}>
                <ul className={styles.list}>
                  {visibles.map((notif) => {
                    const { Icono, clase } = ICONO_POR_TIPO[tipoDe(notif)];
                    return (
                      <li key={notif.id}>
                        <button
                          type="button"
                          role="menuitem"
                          className={`${styles.itemLink} ${notif.leida ? styles.leida : ''}`}
                          onClick={() => handleClick(notif)}
                        >
                          <span className={`${styles.icono} ${styles[clase]}`}>
                            <Icono size={18} strokeWidth={1.75} aria-hidden="true" />
                          </span>
                          <span className={styles.texto}>
                            <span className={styles.titulo}>{notif.titulo}</span>
                            {notif.mensaje && <span className={styles.detalle}>{notif.mensaje}</span>}
                            <span className={styles.meta}>{haceCuanto(notif.creadoEn)}</span>
                          </span>
                          {!notif.leida && <span className={styles.puntoNoLeida} aria-label="Sin leer" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
