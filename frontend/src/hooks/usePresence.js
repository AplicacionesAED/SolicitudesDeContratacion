// Puerto literal de src/shared/layout/usePresence.ts. Reporta la presencia
// del usuario autenticado con un heartbeat periódico -- "activo" (pestaña
// visible + interacción reciente), "ausente" (segundo plano o sin
// interacción por IDLE_MS) o "desconectado" (best-effort al cerrar pestaña,
// el servidor igual lo infiere por ausencia de heartbeats vía UMBRAL_EN_LINEA_MS
// en presence.service.js).
//
// A diferencia del original (mismo origen Next.js), backend y frontend son
// orígenes distintos acá (:3021 vs :5193) -- por eso se usa la URL absoluta
// de API_BASE_URL en vez de una ruta relativa "/api/presence".
import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { API_BASE_URL } from '../api/client.js';

const HEARTBEAT_MS = 30_000;
const IDLE_MS = 60_000;

export function usePresence() {
  const { usuario } = useAuth();
  const ultimaInteraccion = useRef(Date.now());

  useEffect(() => {
    if (!usuario) return;

    function estadoActual() {
      if (document.hidden) return 'ausente';
      if (Date.now() - ultimaInteraccion.current > IDLE_MS) return 'ausente';
      return 'activo';
    }

    function enviar(estado) {
      const payload = JSON.stringify({ estado });
      try {
        if (estado === 'desconectado' && navigator.sendBeacon) {
          navigator.sendBeacon(`${API_BASE_URL}/presence`, new Blob([payload], { type: 'text/plain' }));
          return;
        }
      } catch {
        // continuar con fetch
      }
      fetch(`${API_BASE_URL}/presence`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // silencioso -- el siguiente latido reintenta
      });
    }

    function registrarInteraccion() {
      ultimaInteraccion.current = Date.now();
    }

    const eventos = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    eventos.forEach((e) => document.addEventListener(e, registrarInteraccion, { passive: true }));

    function onVisibilityChange() {
      enviar(estadoActual());
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    function onUnload() {
      enviar('desconectado');
    }
    window.addEventListener('pagehide', onUnload);

    enviar(estadoActual());
    const intervalo = setInterval(() => enviar(estadoActual()), HEARTBEAT_MS);

    return () => {
      clearInterval(intervalo);
      eventos.forEach((e) => document.removeEventListener(e, registrarInteraccion));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onUnload);
    };
  }, [usuario]);
}
