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
    return Response.json({ error: "Solo ADMIN puede ver el historial" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const tipo = searchParams.get("tipo");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (tipo && TIPOS_VALIDOS.has(tipo)) where.tipo = tipo;
  if (desde || hasta) {
    where.creadoEn = {};
    if (desde) (where.creadoEn as Record<string, Date>).gte = new Date(desde);
    if (hasta) (where.creadoEn as Record<string, Date>).lte = new Date(hasta);
  }

  const [total, actividades] = await Promise.all([
    prisma.actividadUsuario.count({ where }),
    prisma.actividadUsuario.findMany({
      where,
      include: {
        user: { select: { id: true, nombre: true, email: true, cargo: true } },
      },
      orderBy: { creadoEn: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return Response.json({
    data: actividades,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}