import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const UMBRAL_EN_LINEA_MS = 75_000;

async function fetchPresenceData() {
  const users = await prisma.user.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      email: true,
      cargo: true,
      rol: true,
      roles: true,
      ultimaConexion: true,
      ultimaActividad: true,
      presenciaEstado: true,
    },
    orderBy: { nombre: "asc" },
  });

  const ahora = Date.now();

  return users.map((u) => {
    const fresco =
      u.ultimaActividad != null &&
      ahora - new Date(u.ultimaActividad).getTime() < UMBRAL_EN_LINEA_MS;

    let estado: "activo" | "ausente" | "desconectado";
    if (u.presenciaEstado === "desconectado" || !fresco) {
      estado = "desconectado";
    } else if (u.presenciaEstado === "ausente") {
      estado = "ausente";
    } else {
      estado = "activo";
    }

    return {
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      cargo: u.cargo,
      roles: (() => { try { return JSON.parse(u.roles || "[]"); } catch { return [u.rol]; } })(),
      ultimaConexion: u.ultimaConexion,
      ultimaActividad: u.ultimaActividad,
      estado,
    };
  });
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("No autenticado", { status: 401 });
  }

  const userRoles: string[] = session.user.roles ?? [session.user.rol];
  if (!userRoles.includes("ADMIN")) {
    return new Response("Solo ADMIN", { status: 403 });
  }

  const encoder = new TextEncoder();
  let lastData: string | null = null;
  let intervalId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      function send(data: string) {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // connection already closed
        }
      }

      send(": ping\n\n");

      intervalId = setInterval(async () => {
        if (request.signal.aborted) {
          clearInterval(intervalId);
          return;
        }
        try {
          const data = await fetchPresenceData();
          const json = JSON.stringify(data);
          if (json !== lastData) {
            lastData = json;
            send(`data: ${json}\n\n`);
          } else {
            send(": ping\n\n");
          }
        } catch {
          clearInterval(intervalId);
          try { controller.close(); } catch { }
        }
      }, 5_000);
    },
    cancel() {
      clearInterval(intervalId);
    },
  });

  request.signal.addEventListener("abort", () => {
    clearInterval(intervalId);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}