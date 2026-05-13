import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { microsoftId: null },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/microsoft/unlink error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
