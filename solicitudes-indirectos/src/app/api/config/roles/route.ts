import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseRol(r: { slug: string; nombre: string; descripcion: string | null; funcionalidades: string; verTodasSolicitudes: boolean; protegido: boolean; creadoEn: Date; actualizadoEn: Date }) {
  return { ...r, funcionalidades: JSON.parse(r.funcionalidades) as string[] };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return Response.json({ error: "Solo ADMIN" }, { status: 403 });

  const roles = await prisma.rol.findMany({ orderBy: { creadoEn: "asc" } });
  return Response.json(roles.map(parseRol));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.rol !== "ADMIN") return Response.json({ error: "Solo ADMIN" }, { status: 403 });

  const body = await request.json() as {
    nombre?: string;
    descripcion?: string;
    funcionalidades?: string[];
    verTodasSolicitudes?: boolean;
  };

  if (!body.nombre?.trim()) {
    return Response.json({ error: "nombre es requerido" }, { status: 400 });
  }

  const slug = body.nombre
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

  if (!slug) {
    return Response.json({ error: "Nombre inválido — no genera un slug válido" }, { status: 400 });
  }

  const existing = await prisma.rol.findUnique({ where: { slug } });
  if (existing) {
    return Response.json({ error: `Ya existe un rol con el slug "${slug}"` }, { status: 409 });
  }

  const rol = await prisma.rol.create({
    data: {
      slug,
      nombre: body.nombre.trim(),
      descripcion: body.descripcion?.trim() || null,
      funcionalidades: JSON.stringify(body.funcionalidades ?? []),
      verTodasSolicitudes: body.verTodasSolicitudes ?? false,
      protegido: false,
    },
  });

  return Response.json(parseRol(rol), { status: 201 });
}
