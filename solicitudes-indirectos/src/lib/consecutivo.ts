import { prisma } from "@/lib/prisma";
import { abbreviate, normalizeFrenteName } from "@/lib/utils";

/**
 * Resuelve las abreviaturas de proyecto y frente usadas para construir el
 * consecutivo de una Solicitud (ej. "SOL-CONT-BK-KALA1-003"). Compartido por
 * la creación normal, la creación de otrosí y la importación histórica —
 * las tres necesitan exactamente la misma regla de abreviación.
 */
export async function resolveConsecutivoAbbrs(
  proyectoId: number,
  firstFrenteId: number | undefined
): Promise<{ proyAbbr: string; frenAbbr: string }> {
  const [proyectoData, frenteData] = await Promise.all([
    prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { nombre: true, codigoConsecutivo: true },
    }),
    firstFrenteId
      ? prisma.frente.findUnique({ where: { id: firstFrenteId }, select: { nombre: true } })
      : Promise.resolve(null),
  ]);

  const proyAbbr =
    proyectoData?.codigoConsecutivo?.trim() ||
    abbreviate(proyectoData?.nombre ?? String(proyectoId), 3);
  const frenAbbr = normalizeFrenteName(frenteData?.nombre ?? String(firstFrenteId ?? ""));

  return { proyAbbr, frenAbbr };
}
