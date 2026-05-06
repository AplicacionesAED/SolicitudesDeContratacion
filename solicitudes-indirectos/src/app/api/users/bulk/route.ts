import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const userRoles: string[] = session.user.roles ?? [session.user.rol];
    if (!userRoles.includes("ADMIN")) {
      return Response.json({ error: "Solo ADMIN puede realizar acciones masivas" }, { status: 403 });
    }

    const { userIds, frentesIds, action } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return Response.json({ error: "No se proporcionaron usuarios" }, { status: 400 });
    }

    if (action === "ASSIGN_FRENTES") {
      if (!frentesIds || !Array.isArray(frentesIds)) {
        return Response.json({ error: "No se proporcionaron frentes" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        for (const userId of userIds) {
          // Opción A: Reemplazar todo
          // await tx.frenteUsuario.deleteMany({ where: { userId } });
          // await tx.frenteUsuario.createMany({
          //   data: frentesIds.map((frenteId: number) => ({ userId, frenteId })),
          // });

          // Opción B: Solo agregar los nuevos (evitando duplicados)
          for (const frenteId of frentesIds) {
            await tx.frenteUsuario.upsert({
              where: {
                userId_frenteId: { userId, frenteId: Number(frenteId) }
              },
              create: { userId, frenteId: Number(frenteId) },
              update: {} // No hacemos nada si ya existe
            });
          }
        }
      });

      return Response.json({ message: "Frentes asignados correctamente" });
    }

    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/users/bulk error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
