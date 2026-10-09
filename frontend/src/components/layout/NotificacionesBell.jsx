// Puerto de src/shared/layout/notificacionesBell.tsx -- mismo patrón de
// dropdown que UserMenu.jsx (containerRef + onBlurCapture), pero con SSE en
// vez de polling para el badge de no-leídas.
//
// El backend está en otro origen (:3021 vs :5193 en dev), así que a
// diferencia del original (`new EventSource("/api/notificaciones/stream")`,
// mismo origen que Next.js) hace falta la URL absoluta + `withCredentials:
// true` para que la cookie de sesión httpOnly viaje con la conexión SSE.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { listarNotificaciones, marcarLeida, marcarTodasLeidas } from '../../api/notificaciones.js';
import { API_BASE_URL } from '../../api/client.js';
import styles from './NotificacionesBell.module.css';

function formatRelative(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} día${dias !== 1 ? 's' : ''}`;
}

export function NotificacionesBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [marcandoTodas, setMarcandoTodas] = useState(false);
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
    setMarcandoTodas(true);
    try {
      await marcarTodasLeidas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setTotalNoLeidas(0);
      prevCountRef.current = 0;
    } catch {
      // ignore
    } finally {
      setMarcandoTodas(false);
    }
  }

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
        <Bell size={18} strokeWidth={1.75} className={pulso ? styles.bellPulse : undefined} aria-hidden="true" />
        {totalNoLeidas > 0 && <span className={`${styles.badge} ${pulso ? styles.badgePulse : ''}`}>{totalNoLeidas > 99 ? '99+' : totalNoLeidas}</span>}
      </button>

      {open && (
        <div className={styles.panel} role="menu">
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Notificaciones</span>
            {totalNoLeidas > 0 && (
              <button type="button" className={styles.marcarTodas} disabled={marcandoTodas} onClick={handleMarcarTodas}>
                <CheckCheck size={13} strokeWidth={1.75} aria-hidden="true" />
                Marcar todas
              </button>
            )}
          </div>

          {/* data-lenis-prevent -- el <ReactLenis> de AppShell.jsx captura
              el wheel sobre toda el area de scroll; sin esto, hacer scroll
              sobre esta lista mueve la página de fondo en vez de a sí misma. */}
          <div className={styles.list} data-lenis-prevent>
            {notificaciones.length === 0 ? (
              <div className={styles.empty}>
                <Bell size={26} strokeWidth={1.5} aria-hidden="true" />
                <p>No tienes notificaciones</p>
              </div>
            ) : (
              notificaciones.map((notif) => (
                <button key={notif.id} type="button" className={`${styles.item} ${!notif.leida ? styles.itemNoLeida : ''}`} onClick={() => handleClick(notif)}>
                  {!notif.leida && <span className={styles.dot} aria-hidden="true" />}
                  <span className={styles.itemBody}>
                    <span className={styles.itemTitulo}>{notif.titulo}</span>
                    <span className={styles.itemMensaje}>{notif.mensaje}</span>
                    <span className={styles.itemFecha}>{formatRelative(notif.creadoEn)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
