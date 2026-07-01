import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const TIPOS_VALIDOS = new Set([
  "login",
  "logout",
  "heartbeat",
  "idle",
  "active",
  "page_view",
  "action",
]);

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const userRoles: string[] = session.user.roles ?? [session.user.rol];
  if (!userRoles.includes("ADMIN")) {
    return Response.json({ error: "Solo ADMIN puede exportar" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "actividades";
  const userId = searchParams.get("userId");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const formato = searchParams.get("formato") || "csv";

  let filename = "";
  let headers: string[] = [];
  let rows: string[][] = [];

  if (tipo === "actividades") {
    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (desde || hasta) {
      where.creadoEn = {};
      if (desde) (where.creadoEn as Record<string, Date>).gte = new Date(desde);
      if (hasta) (where.creadoEn as Record<string, Date>).lte = new Date(hasta);
    }

    const actividades = await prisma.actividadUsuario.findMany({
      where,
      include: { user: { select: { nombre: true, email: true, cargo: true } } },
      orderBy: { creadoEn: "desc" },
      take: 10000,
    });

    filename = `actividades_${new Date().toISOString().split("T")[0]}.${formato}`;
    headers = ["Fecha", "Usuario", "Email", "Cargo", "Tipo", "Descripción", "IP", "User Agent", "Metadata"];

    rows = actividades.map((a) => [
      a.creadoEn.toISOString(),
      a.user.nombre,
      a.user.email,
      a.user.cargo || "",
      a.tipo,
      a.descripcion || "",
      a.ip || "",
      a.userAgent || "",
      a.metadata ? JSON.stringify(a.metadata) : "",
    ]);
  } else if (tipo === "sesiones") {
    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (desde || hasta) {
      where.inicio = {};
      if (desde) (where.inicio as Record<string, Date>).gte = new Date(desde);
      if (hasta) (where.inicio as Record<string, Date>).lte = new Date(hasta);
    }

    const sesiones = await prisma.sesionUsuario.findMany({
      where,
      include: { user: { select: { nombre: true, email: true, cargo: true } } },
      orderBy: { inicio: "desc" },
      take: 10000,
    });

    filename = `sesiones_${new Date().toISOString().split("T")[0]}.${formato}`;
    headers = [
      "Usuario",
      "Email",
      "Cargo",
      "Inicio",
      "Fin",
      "Duración (min)",
      "IP",
      "Dispositivo",
      "Navegador",
      "Sistema Op.",
    ];

    rows = sesiones.map((s) => [
      s.user.nombre,
      s.user.email,
      s.user.cargo || "",
      s.inicio.toISOString(),
      s.fin?.toISOString() || "En curso",
      s.duracionSeg ? Math.round(s.duracionSeg / 60).toString() : "En curso",
      s.ip || "",
      s.dispositivo || "",
      s.navegador || "",
      s.sistemaOp || "",
    ]);
  } else {
    return Response.json({ error: "Tipo inválido. Use 'actividades' o 'sesiones'" }, { status: 400 });
  }

  if (formato === "csv") {
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return Response.json({ error: "Formato no soportado. Use 'csv'" }, { status: 400 });
}