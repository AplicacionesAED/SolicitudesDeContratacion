import { prisma } from "@/lib/prisma";
import { FUNCIONALIDADES_POR_ROL } from "@/lib/utils";

const FALLBACK_VER_TODAS = ["CONTRATOS", "CONTROLES", "DIRECTOR_CONTROLES", "DIRECTOR_TECNICO", "ADMIN", "GERENCIA"];

export async function getRolesFuncionalidades(): Promise<Record<string, string[]>> {
  try {
    const roles = await prisma.rol.findMany();
    if (roles.length === 0) return FUNCIONALIDADES_POR_ROL;
    return Object.fromEntries(
      roles.map((r) => [r.slug, JSON.parse(r.funcionalidades) as string[]])
    );
  } catch {
    return FUNCIONALIDADES_POR_ROL;
  }
}

export async function getRolesVerTodas(): Promise<string[]> {
  try {
    const roles = await prisma.rol.findMany({ where: { verTodasSolicitudes: true } });
    if (roles.length === 0) return FALLBACK_VER_TODAS;
    return roles.map((r) => r.slug);
  } catch {
    return FALLBACK_VER_TODAS;
  }
}
