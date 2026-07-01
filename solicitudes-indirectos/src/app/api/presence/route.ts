import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const UMBRAL_EN_LINEA_MS = 75_000;
const ESTADOS_VALIDOS = new Set(["activo", "ausente", "desconectado"]);

function getClientInfo(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return { ip, userAgent };
}

function parseDeviceInfo(userAgent: string) {
  const ua = userAgent.toLowerCase();
  let dispositivo = "desktop";
  if (/mobile|android|iphone|ipad/.test(ua)) dispositivo = /ipad/.test(ua) ? "tablet" : "mobile";

  let navegador = "unknown";
  if (ua.includes("edg/")) navegador = "Edge";
  else if (ua.includes("chrome/")) navegador = "Chrome";
  else if (ua.includes("firefox/")) navegador = "Firefox";
  else if (ua.includes("safari/")) navegador = "Safari";

  let sistemaOp = "unknown";
  if (ua.includes("windows")) sistemaOp = "Windows";
  else if (ua.includes("mac os")) sistemaOp = "macOS";
  else if (ua.includes("linux")) sistemaOp = "Linux";
  else if (ua.includes("android")) sistemaOp = "Android";
  else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) sistemaOp = "iOS";

  return { dispositivo, navegador, sistemaOp };
}

async function registrarActividad(
  userId: string,
  tipo: string,
  descripcion?: string,
  metadata?: Record<string, unknown>,
  request?: Request
) {
  const { ip, userAgent } = request ? getClientInfo(request) : { ip: "unknown", userAgent: "unknown" };
  try {
    await prisma.actividadUsuario.create({
      data: { userId, tipo, descripcion, metadata: metadata as Record<string, string>, ip, userAgent },
    });
  } catch {
    // silencioso
  }
}

async function gestionarSesion(userId: string, estado: string, request?: Request) {
  const { ip, userAgent } = request ? getClientInfo(request) : { ip: "unknown", userAgent: "unknown" };
  const { dispositivo, navegador, sistemaOp } = parseDeviceInfo(userAgent);

  if (estado === "activo") {
    const sesionAbierta = await prisma.sesionUsuario.findFirst({
      where: { userId, fin: null },
      orderBy: { inicio: "desc" },
    });

    if (!sesionAbierta) {
      await prisma.sesionUsuario.create({
        data: { userId, inicio: new Date(), ip, userAgent, dispositivo, navegador, sistemaOp },
      });
      await registrarActividad(userId, "login", "Inicio de sesión", { ip, userAgent }, request);
    } else {
      await registrarActividad(userId, "heartbeat", "Actividad detectada", { estado }, request);
    }
  } else if (estado === "desconectado") {
    const sesionAbierta = await prisma.sesionUsuario.findFirst({
      where: { userId, fin: null },
      orderBy: { inicio: "desc" },
    });

    if (sesionAbierta) {
      const fin = new Date();
      const duracionSeg = Math.floor((fin.getTime() - sesionAbierta.inicio.getTime()) / 1000);
      await prisma.sesionUsuario.update({
        where: { id: sesionAbierta.id },
        data: { fin, duracionSeg },
      });
      await registrarActividad(userId, "logout", "Cierre de sesión", { duracionSeg, ip, userAgent }, request);
    }
  } else if (estado === "ausente") {
    await registrarActividad(userId, "idle", "Usuario inactivo (idle)", {}, request);
  } else if (estado === "activo") {
    await registrarActividad(userId, "active", "Usuario activo de nuevo", {}, request);
  }
}

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
    // payload vacío o malformado
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { ultimaActividad: new Date(), presenciaEstado: estado },
      select: { presenciaEstado: true },
    });

    const estadoAnterior = user.presenciaEstado;
    if (estadoAnterior !== estado) {
      await gestionarSesion(session.user.id, estado, request);
    } else if (estado === "activo") {
      await gestionarSesion(session.user.id, estado, request);
    }
  } catch {
    // no bloquear al cliente
  }

  return new Response(null, { status: 204 });
}

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
      frentesAsignados: { select: { frente: { select: { id: true, nombre: true } } } },
    },
    orderBy: { nombre: "asc" },
  });

  const ahora = Date.now();

  const resultado = users.map((u) => {
    const fresco =
      u.ultimaActividad != null && ahora - new Date(u.ultimaActividad).getTime() < UMBRAL_EN_LINEA_MS;

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
      frentes: u.frentesAsignados.map((fa) => fa.frente),
      ultimaConexion: u.ultimaConexion,
      ultimaActividad: u.ultimaActividad,
      estado,
    };
  });

  return Response.json(resultado);
}