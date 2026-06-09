import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseRol(r: { slug: string; nombre: string; descripcion: string | null; funcionalidades: string; verTodasSolicitudes: boolean; protegido: boolean; creadoEn: Date; actualizadoEn: Date }) {
  return { ...r, funcionalidades: JSON.parse(r.funcionalidades) as string[] };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return Response.json({ error: "Solo ADMIN" }, { status: 403 });

  const { slug } = await params;
  const rol = await prisma.rol.findUnique({ where: { slug } });
  if (!rol) return Response.json({ error: "Rol no encontrado" }, { status: 404 });

  const body = await request.json() as {
    nombre?: string;
    descripcion?: string;
    funcionalidades?: string[];
    verTodasSolicitudes?: boolean;
  };

  const updated = await prisma.rol.update({
    where: { slug },
    data: {
      ...(body.nombre !== undefined ? { nombre: body.nombre.trim() } : {}),
      ...(body.descripcion !== undefined ? { descripcion: body.descripcion?.trim() || null } : {}),
      ...(body.funcionalidades !== undefined ? { funcionalidades: JSON.stringify(body.funcionalidades) } : {}),
      ...(body.verTodasSolicitudes !== undefined ? { verTodasSolicitudes: body.verTodasSolicitudes } : {}),
    },
  });

  return Response.json(parseRol(updated));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return Response.json({ error: "Solo ADMIN" }, { status: 403 });

  const { slug } = await params;
  const rol = await prisma.rol.findUnique({ where: { slug } });
  if (!rol) return Response.json({ error: "Rol no encontrado" }, { status: 404 });
  if (rol.protegido) {
    return Response.json({ error: "Los roles del sistema no se pueden eliminar" }, { status: 400 });
  }

  await prisma.rol.delete({ where: { slug } });
  return Response.json({ ok: true });
}
