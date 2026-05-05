import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const aprobadoParam = searchParams.get("aprobado");

    const where =
      aprobadoParam === "true"
        ? { aprobadoDebidaDiligencia: true }
        : aprobadoParam === "false"
          ? { aprobadoDebidaDiligencia: false }
          : {};

    const terceros = await prisma.tercero.findMany({
      where,
      orderBy: { razonSocial: "asc" },
    });

    return Response.json(terceros);
  } catch (error) {
    console.error("GET /api/terceros error:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();

    const razonSocial: string = body.razonSocial?.trim();
    const nit: string = body.nit?.trim();
    const tipoContrato: string = body.tipoContrato;
    const confidencialidad: boolean = body.confidencialidad ?? false;

    // Validación básica
    if (!razonSocial || !nit || !tipoContrato) {
      return Response.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    // 🔴 Validar duplicado por NIT
    const existingByNit = await prisma.tercero.findFirst({
      where: { nit },
    });

    if (existingByNit) {
      return Response.json(
        { error: "Ya existe un tercero con ese NIT" },
        { status: 409 }
      );
    }

    // 🔴 Validar duplicado por razón social (unique)
    const existingByRazon = await prisma.tercero.findUnique({
      where: { razonSocial },
    });

    if (existingByRazon) {
      return Response.json(
        { error: "Ya existe un tercero con esa razón social" },
        { status: 409 }
      );
    }

    // ✅ Crear tercero
    const tercero = await prisma.tercero.create({
      data: {
        razonSocial,
        nit,
        tipoContrato,
        confidencialidad,
      },
    });

    return Response.json(tercero, { status: 201 });
  } catch (error) {
    console.error("POST /api/terceros error:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}