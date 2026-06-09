import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const userRoles: string[] = session.user.roles ?? [session.user.rol];
    if (!userRoles.includes("ADMIN")) {
      return Response.json({ error: "Solo ADMIN puede resetear contraseñas" }, { status: 403 });
    }

    const body = await request.json();
    const { users } = body as { users: { id: string; password: string }[] };

    if (!Array.isArray(users) || users.length === 0) {
      return Response.json({ error: "Se requiere al menos un usuario" }, { status: 400 });
    }

    await Promise.all(
      users.map(async ({ id, password }) => {
        const hashed = await bcrypt.hash(password, 12);
        await prisma.user.update({ where: { id }, data: { password: hashed } });
      })
    );

    return Response.json({ success: true, count: users.length });
  } catch (error) {
    console.error("POST /api/users/reset-passwords error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
