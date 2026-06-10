import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    if (session.user.rol !== "ADMIN") {
      return Response.json(
        { error: "Solo ADMIN puede configurar aprobadores" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { frenteId, aprobadorId } = body as {
      frenteId: number;
      aprobadorId: string;
    };

    if (!frenteId || !aprobadorId) {
      return Response.json(
        { error: "frenteId y aprobadorId son obligatorios" },
        { status: 400 }
      );
    }

    // Validate frente exists
    const frente = await prisma.frente.findUnique({ where: { id: frenteId } });
    if (!frente) {
      return Response.json({ error: "Frente no encontrado" }, { status: 404 });
    }

    // Validate aprobador exists and has DIRECTOR_PROYECTO role
    const aprobador = await prisma.user.findUnique({ where: { id: aprobadorId } });
    if (!aprobador) {
      return Response.json({ error: "Aprobador no encontrado" }, { status: 404 });
    }
    if (aprobador.rol !== "DIRECTOR_PROYECTO") {
      return Response.json(
        { error: "El aprobador debe tener rol DIRECTOR_PROYECTO" },
        { status: 400 }
      );
    }

    // Preserve any additional configured directors; replace only the first one
    const existing = await prisma.aprobadorFrente.findUnique({ where: { frenteId } });
    const existingIds: string[] = (() => { try { return JSON.parse(existing?.aprobadorIds ?? "[]"); } catch { return []; } })();
    const updatedIds = [aprobadorId, ...existingIds.filter((id) => id !== aprobadorId)];

    const config = await prisma.aprobadorFrente.upsert({
      where: { frenteId },
      update: { aprobadorIds: JSON.stringify(updatedIds) },
      create: { frenteId, aprobadorIds: JSON.stringify(updatedIds) },
      include: {
        frente: { include: { proyecto: true } },
      },
    });

    return Response.json(config, { status: 200 });
  } catch (error) {
    console.error("POST /api/config/aprobadores error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
