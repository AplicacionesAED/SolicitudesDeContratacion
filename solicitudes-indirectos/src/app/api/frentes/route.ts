import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const frentes = await prisma.frente.findMany({
      include: {
        proyecto: { select: { id: true, nombre: true, activo: true } },
        aprobadorConfig: true,
        usuarios: {
          include: {
            user: { select: { id: true, nombre: true, rol: true, cargo: true } },
          },
        },
      },
      orderBy: [{ proyecto: { nombre: "asc" } }, { nombre: "asc" }],
    });

    return Response.json(frentes);
  } catch (error) {
    console.error("GET /api/frentes error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionRoles: string[] = session?.user?.roles ?? (session?.user?.rol ? [session.user.rol] : []);
    if (!session?.user || !sessionRoles.includes("ADMIN")) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const { nombre, proyectoId, etapa } = await request.json();
    if (!nombre?.trim()) {
      return Response.json({ error: "El nombre es requerido" }, { status: 400 });
    }
    if (!proyectoId) {
      return Response.json({ error: "El proyecto es requerido" }, { status: 400 });
    }

    const proyecto = await prisma.proyecto.findUnique({ where: { id: Number(proyectoId) } });
    if (!proyecto) {
      return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const frente = await prisma.frente.create({
      data: {
        nombre: nombre.trim(),
        proyectoId: Number(proyectoId),
        etapa: etapa ? Number(etapa) : null,
      },
      include: {
        proyecto: { select: { id: true, nombre: true, activo: true } },
        aprobadorConfig: true
      },
    });

    return Response.json(frente, { status: 201 });
  } catch (error) {
    console.error("POST /api/frentes error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionRoles: string[] = session?.user?.roles ?? (session?.user?.rol ? [session.user.rol] : []);
    if (!session?.user || !sessionRoles.includes("ADMIN")) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id, nombre, proyectoId, etapa, aprobadorId, contratosTramiteId, contratosMinutaId, controlesId, directorControlesId } = await request.json();
    if (!id) {
      return Response.json({ error: "El ID del frente es requerido" }, { status: 400 });
    }

    const data: any = {
      ...(nombre ? { nombre: nombre.trim() } : {}),
      ...(proyectoId ? { proyecto: { connect: { id: Number(proyectoId) } } } : {}),
      ...(etapa !== undefined ? { etapa: etapa ? Number(etapa) : null } : {}),
    };

    if (aprobadorId !== undefined || contratosTramiteId !== undefined || contratosMinutaId !== undefined || controlesId !== undefined || directorControlesId !== undefined) {
      if (aprobadorId || contratosTramiteId || contratosMinutaId || controlesId || directorControlesId) {
        data.aprobadorConfig = {
          upsert: {
            create: { 
              aprobadorId: aprobadorId || "",
              contratosTramiteId: contratosTramiteId || null,
              contratosMinutaId: contratosMinutaId || null,
              controlesId: controlesId || null,
              directorControlesId: directorControlesId || null,
            },
            update: { 
              aprobadorId: aprobadorId || "",
              contratosTramiteId: contratosTramiteId || null,
              contratosMinutaId: contratosMinutaId || null,
              controlesId: controlesId || null,
              directorControlesId: directorControlesId || null,
            }
          }
        };
      } else {
        // Si vienen todos vacíos, lo eliminamos
        data.aprobadorConfig = {
          delete: true
        };
      }
    }

    const frente = await prisma.frente.update({
      where: { id: Number(id) },
      data,
      include: {
        proyecto: { select: { id: true, nombre: true, activo: true } },
        aprobadorConfig: true
      },
    });

    return Response.json(frente);
  } catch (error) {
    // Si intentamos borrar un aprobador que no existe, Prisma puede dar error. 
    // Capturamos específicamente errores de delete si no existe el registro.
    console.error("PATCH /api/frentes error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionRoles: string[] = session?.user?.roles ?? (session?.user?.rol ? [session.user.rol] : []);
    if (!session?.user || !sessionRoles.includes("ADMIN")) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return Response.json({ error: "El ID del frente es requerido" }, { status: 400 });
    }

    await prisma.frente.delete({ where: { id: Number(id) } });

    return Response.json({ message: "Frente eliminado correctamente" });
  } catch (error) {
    console.error("DELETE /api/frentes error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
