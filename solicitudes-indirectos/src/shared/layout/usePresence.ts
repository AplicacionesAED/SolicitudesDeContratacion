"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

// Cada cuánto se envía el latido al servidor.
const HEARTBEAT_MS = 30_000;
// Sin interacción durante este tiempo → "ausente" (pestaña abierta pero ocioso).
const IDLE_MS = 60_000;

type Estado = "activo" | "ausente" | "desconectado";

/**
 * Reporta la presencia del usuario autenticado mediante un heartbeat periódico.
 *
 * - "activo": pestaña visible y con interacción reciente.
 * - "ausente": pestaña en segundo plano o sin interacción por más de IDLE_MS.
 * - "desconectado": se envía (best-effort) al cerrar la pestaña.
 *
 * El estado "desconectado" real lo infiere el servidor por ausencia de latidos,
 * así que un cierre abrupto (crash, pérdida de red) también se detecta por timeout.
 */
export function usePresence() {
  const { status } = useSession();
  const ultimaInteraccion = useRef<number>(Date.now());

  useEffect(() => {
    if (status !== "authenticated") return;

    function estadoActual(): Estado {
      if (document.hidden) return "ausente";
      if (Date.now() - ultimaInteraccion.current > IDLE_MS) return "ausente";
      return "activo";
    }

    function enviar(estado: Estado) {
      // sendBeacon es más fiable durante el cierre; fetch keepalive en el resto.
      const payload = JSON.stringify({ estado });
      try {
        if (estado === "desconectado" && navigator.sendBeacon) {
          navigator.sendBeacon("/api/presence", new Blob([payload], { type: "text/plain" }));
          return;
        }
      } catch {
        // continuar con fetch
      }
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // silencioso — el siguiente latido reintenta
      });
    }

    function registrarInteraccion() {
      ultimaInteraccion.current = Date.now();
    }

    const eventos: (keyof DocumentEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];
    eventos.forEach((e) => document.addEventListener(e, registrarInteraccion, { passive: true }));

    function onVisibilityChange() {
      enviar(estadoActual());
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    function onUnload() {
      enviar("desconectado");
    }
    window.addEventListener("pagehide", onUnload);

    // Latido inicial + intervalo.
    enviar(estadoActual());
    const intervalo = setInterval(() => enviar(estadoActual()), HEARTBEAT_MS);

    return () => {
      clearInterval(intervalo);
      eventos.forEach((e) => document.removeEventListener(e, registrarInteraccion));
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onUnload);
    };
  }, [status]);
}
