import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const userRoles: string[] = session.user.roles ?? [session.user.rol];
  if (!userRoles.includes("ADMIN")) {
    return Response.json({ error: "Solo ADMIN puede ver las sesiones" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (desde || hasta) {
    where.inicio = {};
    if (desde) (where.inicio as Record<string, Date>).gte = new Date(desde);
    if (hasta) (where.inicio as Record<string, Date>).lte = new Date(hasta);
  }

  const [total, sesiones] = await Promise.all([
    prisma.sesionUsuario.count({ where }),
    prisma.sesionUsuario.findMany({
      where,
      include: {
        user: { select: { id: true, nombre: true, email: true, cargo: true } },
      },
      orderBy: { inicio: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return Response.json({
    data: sesiones,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}