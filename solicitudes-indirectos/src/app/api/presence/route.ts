import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Un usuario se considera "en línea" si su último heartbeat fue hace menos de
// este umbral. Debe ser mayor que el intervalo de heartbeat del cliente (30 s)
// para evitar parpadeos.
const UMBRAL_EN_LINEA_MS = 75_000;

const ESTADOS_VALIDOS = new Set(["activo", "ausente", "desconectado"]);

/**
 * Heartbeat de presencia. Cada usuario autenticado reporta su estado actual.
 * Acepta tanto JSON normal como payloads de navigator.sendBeacon (text/plain).
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  let estado = "activo";
  try {
    const text = await request.text();
    if (text) {
      const body = JSON.parse(text);
      if (typeof body.estado === "string" && ESTADOS_VALIDOS.has(body.estado)) {
        estado = body.estado;
      }
    }
  } catch {
    // payload vacío o malformado — usar estado por defecto
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { ultimaActividad: new Date(), presenciaEstado: estado },
    });
  } catch {
    // no bloquear al cliente por un fallo de registro
  }

  return new Response(null, { status: 204 });
}

/**
 * Lista de usuarios con su estado de presencia calculado. Solo ADMIN.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const userRoles: string[] = session.user.roles ?? [session.user.rol];
  if (!userRoles.includes("ADMIN")) {
    return Response.json({ error: "Solo ADMIN puede ver la presencia" }, { status: 403 });
  }

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

  const resultado = users.map((u) => {
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

  return Response.json(resultado);
}
