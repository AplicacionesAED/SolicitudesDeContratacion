import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma";
import * as fs from "fs";
import * as path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

const ESTADOS = [
  "BORRADOR",
  "ENVIADA",
  "EN_TRAMITE_CONTRATOS",
  "CREACION_MINUTA",
  "ENVIO_CONTRATO_POLIZAS",
  "EN_CONTROLES",
  "APROBACION_FINAL",
  "COMPLETADA",
  "DEVUELTA",
  "EN_REVISION",
] as const;

async function main() {
  console.log("🔧 Configurando datos de prueba...");

  // ── Fetch seed entities ────────────────────────────────────────────────────
  const solicitante = await prisma.user.findUniqueOrThrow({
    where: { email: "smercado@baiak.com" },
  });
  const directorProyecto = await prisma.user.findUniqueOrThrow({
    where: { email: "crodriguez@baiak.com" },
  });
  const contratos = await prisma.user.findUniqueOrThrow({
    where: { email: "amorales@baiak.com" },
  });
  const controles = await prisma.user.findUniqueOrThrow({
    where: { email: "ljimenez@baiak.com" },
  });
  const directorControles = await prisma.user.findUniqueOrThrow({
    where: { email: "msuarez@baiak.com" },
  });

  const proyecto = await prisma.proyecto.findFirst({ orderBy: { id: "asc" } });
  if (!proyecto) throw new Error("No hay proyectos — ejecuta npm run db:seed primero");

  const frente = await prisma.frente.findFirst({
    where: { proyectoId: proyecto.id },
    orderBy: { id: "asc" },
  });
  if (!frente) throw new Error("No hay frentes — ejecuta npm run db:seed primero");

  const tercero = await prisma.tercero.findFirst({
    where: { aprobadoDebidaDiligencia: true },
    orderBy: { id: "asc" },
  });
  if (!tercero) {
    throw new Error("No hay terceros con DD aprobada — ejecuta npm run db:seed primero");
  }

  // ── Delete previous test solicitudes ──────────────────────────────────────
  await prisma.solicitud.deleteMany({
    where: { consecutivo: { startsWith: "DOC-TEST-" } },
  });

  // ── Create one solicitud per estado ───────────────────────────────────────
  const created: Record<string, number> = {};

  for (const estado of ESTADOS) {
    const sol = await prisma.solicitud.create({
      data: {
        consecutivo: `DOC-TEST-${estado}`,
        tipo: "ORDEN_SERVICIO",
        estado,
        solicitanteId: solicitante.id,
        aprobadorId: directorProyecto.id,
        responsableContratosTramiteId: contratos.id,
        responsableContratosMinutaId: contratos.id,
        coordinadorControlesId: controles.id,
        directorControlesId: directorControles.id,
        proyectoId: proyecto.id,
        frentesIds: JSON.stringify([frente.id]),
        terceroId: tercero.id,
        descripcionActividad: "Servicio de mantenimiento correctivo de equipos de construcción en la obra.",
        plazoEjecucion: "3 meses",
        formaPago: "Acta de recibo de obra",
        valorFinal: 48500000,
        asunto: `${frente.nombre} – ${tercero.razonSocial} – Mantenimiento de equipos`,
        alcance: "Incluye mano de obra, materiales menores y transporte al sitio de obra.",
        archivoCuadroComparativo: "/uploads/placeholder.pdf",
        archivoCotizacion: "/uploads/placeholder.pdf",
        archivoGeneradorGastos: "/uploads/placeholder.pdf",
        archivoEvaluacionInicial: "/uploads/placeholder.pdf",
      },
    });
    created[estado] = sol.id;
    console.log(`  ✓ ${estado.padEnd(30)} → id=${sol.id}`);
  }

  // ── Write JSON with IDs ────────────────────────────────────────────────────
  const output = {
    solicitudes: created,
    users: {
      solicitante: solicitante.email,
      directorProyecto: directorProyecto.email,
      contratos: contratos.email,
      controles: controles.email,
      directorControles: directorControles.email,
    },
    terceroId: tercero.id,
  };

  const outPath = path.join(__dirname, "test-data.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ test-data.json guardado en ${outPath}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
