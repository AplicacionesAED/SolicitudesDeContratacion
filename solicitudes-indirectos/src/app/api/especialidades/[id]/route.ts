import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tienePermiso } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const nombre: string | undefined = body.nombre?.trim();
    const descripcion: string | null | undefined =
      body.descripcion !== undefined ? body.descripcion?.trim() || null : undefined;

    if (nombre !== undefined && !nombre) {
      return Response.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }

    const existente = await prisma.especialidad.findUnique({ where: { id: Number(id) } });
    if (!existente) {
      return Response.json({ error: "Especialidad no encontrada" }, { status: 404 });
    }

    if (nombre && nombre !== existente.nombre) {
      const duplicado = await prisma.especialidad.findUnique({ where: { nombre } });
      if (duplicado) {
        return Response.json({ error: "Ya existe una especialidad con ese nombre" }, { status: 409 });
      }
    }

    const especialidad = await prisma.especialidad.update({
      where: { id: Number(id) },
      data: {
        ...(nombre !== undefined ? { nombre } : {}),
        ...(descripcion !== undefined ? { descripcion } : {}),
      },
    });

    return Response.json(especialidad);
  } catch (error) {
    console.error("PATCH /api/especialidades/[id] error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const existente = await prisma.especialidad.findUnique({ where: { id: Number(id) } });
    if (!existente) {
      return Response.json({ error: "Especialidad no encontrada" }, { status: 404 });
    }

    await prisma.especialidad.delete({ where: { id: Number(id) } });

    return Response.json({ message: "Especialidad eliminada correctamente" });
  } catch (error) {
    console.error("DELETE /api/especialidades/[id] error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
