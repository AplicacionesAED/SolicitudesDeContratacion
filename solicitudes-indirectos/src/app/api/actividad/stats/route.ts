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
    return Response.json({ error: "Solo ADMIN puede ver estadísticas" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde") ? new Date(searchParams.get("desde")!) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const hasta = searchParams.get("hasta") ? new Date(searchParams.get("hasta")!) : new Date();

  const [
    totalUsuarios,
    usuariosActivos,
    sesionesPeriodo,
    actividadesPorTipo,
    sesionesPorDia,
    duracionMediaSesion,
    horasPico,
  ] = await Promise.all([
    prisma.user.count({ where: { activo: true } }),
    prisma.user.count({ where: { activo: true, presenciaEstado: { not: "desconectado" } } }),
    prisma.sesionUsuario.findMany({
      where: { inicio: { gte: desde, lte: hasta } },
      select: { inicio: true, fin: true, duracionSeg: true, userId: true },
    }),
    prisma.actividadUsuario.groupBy({
      by: ["tipo"],
      where: { creadoEn: { gte: desde, lte: hasta } },
      _count: { tipo: true },
    }),
    prisma.$queryRaw`
      SELECT DATE_TRUNC('day', inicio)::date as dia, COUNT(*) as total
      FROM "SesionUsuario"
      WHERE inicio >= ${desde} AND inicio <= ${hasta}
      GROUP BY DATE_TRUNC('day', inicio)
      ORDER BY dia
    `,
    prisma.sesionUsuario.aggregate({
      where: { fin: { not: null }, inicio: { gte: desde, lte: hasta } },
      _avg: { duracionSeg: true },
    }),
    prisma.$queryRaw`
      SELECT EXTRACT(HOUR FROM inicio)::int as hora, COUNT(*) as total
      FROM "SesionUsuario"
      WHERE inicio >= ${desde} AND inicio <= ${hasta}
      GROUP BY EXTRACT(HOUR FROM inicio)
      ORDER BY hora
    `,
  ]);

  const usuariosUnicosConSesion = new Set(sesionesPeriodo.map((s) => s.userId)).size;
  const sesionesCompletadas = sesionesPeriodo.filter((s) => s.fin);
  const duracionMedia = duracionMediaSesion._avg.duracionSeg
    ? Math.round(duracionMediaSesion._avg.duracionSeg / 60)
    : 0;

  const actividadesFormateadas = actividadesPorTipo.map((a) => ({
    tipo: a.tipo,
    count: a._count.tipo,
  }));

  const sesionesPorDiaFormateadas = (sesionesPorDia as Array<{ dia: Date; total: bigint }>).map((d) => ({
    dia: d.dia.toISOString().split("T")[0],
    total: Number(d.total),
  }));

  const horasPicoFormateadas = (horasPico as Array<{ hora: number; total: bigint }>).map((h) => ({
    hora: h.hora,
    total: Number(h.total),
  }));

  return Response.json({
    resumen: {
      totalUsuarios,
      usuariosActivos,
      usuariosConSesion: usuariosUnicosConSesion,
      totalSesiones: sesionesPeriodo.length,
      sesionesCompletadas: sesionesCompletadas.length,
      duracionMediaMinutos: duracionMedia,
    },
    actividadesPorTipo: actividadesFormateadas,
    sesionesPorDia: sesionesPorDiaFormateadas,
    horasPico: horasPicoFormateadas,
    periodo: { desde: desde.toISOString(), hasta: hasta.toISOString() },
  });
}