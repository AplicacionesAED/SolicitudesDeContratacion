import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FrenteDetalle from "@/features/frentes/components/frenteDetalle";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FrenteDetallePage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.rol !== "ADMIN") {
    // Solo admins pueden configurar frentes
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">No tienes permisos para acceder a esta página.</p>
      </div>
    );
  }

  const frenteId = parseInt(id, 10);
  if (isNaN(frenteId)) notFound();

  const [frenteRaw, allUsersRaw] = await Promise.all([
    prisma.frente.findUnique({
      where: { id: frenteId },
      include: {
        proyecto: { select: { nombre: true } },
        aprobadorConfig: true,
        usuarios: {
          include: {
            user: {
              select: {
                id: true,
                nombre: true,
                roles: true,
                cargo: true,
              }
            }
          }
        }
      }
    }),
    prisma.user.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        roles: true,
        cargo: true,
      }
    })
  ]);

  if (!frenteRaw) notFound();

  // Parsing roles JSON strings to arrays
  const parseRoles = (rolesStr: string): string[] => {
    try {
      return JSON.parse(rolesStr || "[]");
    } catch {
      return [];
    }
  };

  const frente = {
    ...frenteRaw,
    usuarios: frenteRaw.usuarios.map(fu => ({
      ...fu,
      user: fu.user ? {
        ...fu.user,
        roles: parseRoles(fu.user.roles)
      } : undefined
    }))
  };

  const allUsers = allUsersRaw.map(u => ({
    ...u,
    roles: parseRoles(u.roles)
  }));

  return <FrenteDetalle frente={frente as any} allUsers={allUsers as any} />;
}
