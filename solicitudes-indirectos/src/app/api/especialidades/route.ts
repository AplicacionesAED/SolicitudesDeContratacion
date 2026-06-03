import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tienePermiso } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const especialidades = await prisma.especialidad.findMany({
      orderBy: { nombre: "asc" },
    });

    return Response.json(especialidades);
  } catch (error) {
    console.error("GET /api/especialidades error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

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
    const nombre: string = body.nombre?.trim();
    const descripcion: string | null = body.descripcion?.trim() || null;

    if (!nombre) {
      return Response.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const existente = await prisma.especialidad.findUnique({ where: { nombre } });
    if (existente) {
      return Response.json({ error: "Ya existe una especialidad con ese nombre" }, { status: 409 });
    }

    const especialidad = await prisma.especialidad.create({
      data: { nombre, descripcion },
    });

    return Response.json(especialidad, { status: 201 });
  } catch (error) {
    console.error("POST /api/especialidades error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
