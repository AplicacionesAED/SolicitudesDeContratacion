import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tienePermiso } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const roles = session.user.roles ?? [];
    const funcionalidadesAdicionales = session.user.funcionalidadesAdicionales ?? [];

    if (!tienePermiso(roles, funcionalidadesAdicionales, "gestionar_especialidades")) {
      return Response.json({ error: "No tiene permiso para gestionar especialidades" }, { status: 403 });
    }

    const body = await request.json();
    const nombres: string[] = Array.isArray(body.nombres) ? body.nombres : [];

    if (nombres.length === 0) {
      return Response.json({ error: "No se proporcionaron nombres" }, { status: 400 });
    }

    const trimmed = nombres.map((n) => n.trim()).filter(Boolean);

    const existentes = await prisma.especialidad.findMany({
      where: { nombre: { in: trimmed } },
      select: { nombre: true },
    });
    const existentesSet = new Set(existentes.map((e) => e.nombre));

    const nuevos = trimmed.filter((n) => !existentesSet.has(n));

    if (nuevos.length > 0) {
      await prisma.especialidad.createMany({
        data: nuevos.map((nombre) => ({ nombre, descripcion: null })),
        skipDuplicates: true,
      });
    }

    return Response.json({ created: nuevos.length, skipped: trimmed.length - nuevos.length });
  } catch (error) {
    console.error("POST /api/especialidades/import error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
