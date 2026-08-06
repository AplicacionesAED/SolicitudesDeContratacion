import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tienePermiso, buildConsecutivo, numeroALetras } from "@/lib/utils";
import { resolveConsecutivoAbbrs } from "@/lib/consecutivo";
import { pickMostRecentOtrosi } from "@/lib/otrosi";

const TIPOS_CONTRATO_HISTORICO = [
  "CONTRATO",
  "TRAMITE_CUENTA",
  "TRAMITE_FACTURAS",
  "TRAMITE_CUENTAS_RECURRENTES",
  "TRAMITE_CUENTAS_OCASIONALES",
  "TRAMITE_BONIFICACIONES_COMISIONES",
];
const TIPOS_OTROSI_HISTORICO = ["OTROSI_TIEMPO", "OTROSI_TIEMPO_CANTIDAD"];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const userRoles: string[] = session.user.roles ?? [session.user.rol];
    const funcionalidadesAdicionales: string[] = session.user.funcionalidadesAdicionales ?? [];

    if (!tienePermiso(userRoles, funcionalidadesAdicionales, "crear_enviar_solicitudes")) {
      return Response.json(
        { error: "No tienes permiso para importar solicitudes históricas." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      modo,
      tipo,
      terceroId,
      proyectoId,
      frentesIds,
      valorFinal,
      fechaInicio,
      fechaFin,
      solicitudPadreId,
      numeroOtrosi: numeroOtrosiInput,
    } = body;

    if (modo !== "CONTRATO" && modo !== "OTROSI") {
      return Response.json({ error: "modo debe ser CONTRATO u OTROSI" }, { status: 400 });
    }

    if (!fechaInicio || !fechaFin) {
      return Response.json({ error: "fechaInicio y fechaFin son obligatorios" }, { status: 400 });
    }
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return Response.json({ error: "Fechas inválidas" }, { status: 400 });
    }
    if (fin <= inicio) {
      return Response.json({ error: "fechaFin debe ser posterior a fechaInicio" }, { status: 400 });
    }

    // ── Modo OTROSI ──────────────────────────────────────────────────────────
    if (modo === "OTROSI") {
      if (!tienePermiso(userRoles, funcionalidadesAdicionales, "crear_otrosi")) {
        return Response.json(
          { error: "No tienes permiso para importar otrosís históricos." },
          { status: 403 }
        );
      }
      if (!tipo || !TIPOS_OTROSI_HISTORICO.includes(tipo)) {
        return Response.json({ error: "Tipo inválido para otrosí histórico" }, { status: 400 });
      }
      if (!solicitudPadreId) {
        return Response.json({ error: "solicitudPadreId es obligatorio en modo OTROSI" }, { status: 400 });
      }
      const numeroOtrosiManual = Number(numeroOtrosiInput);
      if (!numeroOtrosiInput || !Number.isInteger(numeroOtrosiManual) || numeroOtrosiManual <= 0) {
        return Response.json({ error: "numeroOtrosi debe ser un entero positivo" }, { status: 400 });
      }

      const parent = await prisma.solicitud.findUnique({ where: { id: Number(solicitudPadreId) } });
      if (!parent) {
        return Response.json({ error: "Solicitud padre no encontrada" }, { status: 404 });
      }
      if (parent.tipo === "ORDEN_SERVICIO") {
        return Response.json({ error: "Las Órdenes de Servicio no admiten otrosí" }, { status: 400 });
      }
      if (parent.estado !== "COMPLETADA") {
        return Response.json(
          { error: "Solo se pueden importar otrosís de solicitudes en estado COMPLETADA" },
          { status: 400 }
        );
      }

      const activeOtrosi = await prisma.solicitud.findFirst({
        where: { solicitudPadreId: parent.id, estado: { not: "COMPLETADA" } },
        select: { consecutivo: true },
      });
      if (activeOtrosi) {
        return Response.json(
          {
            error: `Ya existe un otrosí activo para este contrato (${activeOtrosi.consecutivo}). Debe completarse antes de importar uno nuevo.`,
          },
          { status: 400 }
        );
      }

      const completedOtrosis = await prisma.solicitud.findMany({
        where: { solicitudPadreId: parent.id, estado: "COMPLETADA" },
        select: { valorFinal: true, valorEnLetras: true, numeroOtrosi: true, creadoEn: true },
      });
      const baseline = pickMostRecentOtrosi(completedOtrosis) ?? parent;

      const finalValorFinal =
        tipo === "OTROSI_TIEMPO_CANTIDAD" && valorFinal != null ? Number(valorFinal) : baseline.valorFinal;
      const finalValorEnLetras =
        tipo === "OTROSI_TIEMPO_CANTIDAD" && valorFinal != null
          ? numeroALetras(Number(valorFinal))
          : baseline.valorEnLetras;

      const parentFrentesIds: number[] = (() => {
        try { return JSON.parse(parent.frentesIds || "[]"); } catch { return []; }
      })();
      const firstFrenteId = parentFrentesIds[0];
      const { proyAbbr, frenAbbr } = await resolveConsecutivoAbbrs(parent.proyectoId, firstFrenteId);

      const solicitud = await prisma.$transaction(async (tx) => {
        const key = `${tipo}-${proyAbbr}-${frenAbbr}`;
        const counter = await tx.contadorConsecutivo.upsert({
          where: { tipo: key },
          update: { ultimo: { increment: 1 } },
          create: { tipo: key, anio: new Date().getFullYear(), ultimo: 1 },
        });
        const consecutivo = buildConsecutivo(tipo, proyAbbr, frenAbbr, counter.ultimo);

        const created = await tx.solicitud.create({
          data: {
            consecutivo,
            tipo,
            solicitudPadreId: parent.id,
            numeroOtrosi: numeroOtrosiManual,
            proyectoId: parent.proyectoId,
            frentesIds: parent.frentesIds,
            solicitanteId: session.user.id,
            aprobadorId: parent.aprobadorId ?? null,
            responsableContratosTramiteId: parent.responsableContratosTramiteId ?? null,
            responsableContratosMinutaId: parent.responsableContratosMinutaId ?? null,
            coordinadorControlesId: parent.coordinadorControlesId ?? null,
            directorControlesId: parent.directorControlesId ?? null,
            estado: "COMPLETADA",
            importadoHistorico: true,
            terceroId: parent.terceroId ?? null,
            descripcionActividad: parent.descripcionActividad ?? null,
            plazoEjecucion: parent.plazoEjecucion ?? null,
            formaPago: parent.formaPago ?? null,
            valorFinal: finalValorFinal ?? null,
            valorEnLetras: finalValorEnLetras ?? null,
            tipoContrato: parent.tipoContrato ?? null,
            asunto: parent.asunto ?? null,
            contratanteNombre: parent.contratanteNombre ?? "AED CONSTRUCTORES S.A.S",
            contratanteNit: parent.contratanteNit ?? "901237628-1",
            cronograma: {
              create: {
                tieneFases: false,
                fechaInicio: inicio,
                fechaFin: fin,
              },
            },
          },
        });

        await tx.historialSolicitud.create({
          data: {
            solicitudId: created.id,
            usuarioId: session.user.id,
            accion: "IMPORTAR_HISTORICO",
            nota: `Otrosí histórico (n.º ${numeroOtrosiManual}) importado por ${session.user.name ?? "un usuario"}.`,
          },
        });

        return created;
      });

      return Response.json(solicitud, { status: 201 });
    }

    // ── Modo CONTRATO ────────────────────────────────────────────────────────
    if (!tipo || !TIPOS_CONTRATO_HISTORICO.includes(tipo)) {
      return Response.json({ error: "Tipo inválido para contrato histórico" }, { status: 400 });
    }
    if (!terceroId || !proyectoId || !Array.isArray(frentesIds) || frentesIds.length === 0) {
      return Response.json(
        { error: "terceroId, proyectoId y frentesIds son obligatorios" },
        { status: 400 }
      );
    }

    const firstFrenteId = frentesIds[0];

    const [frente, tercero] = await Promise.all([
      prisma.frente.findUnique({ where: { id: Number(firstFrenteId) }, select: { id: true, proyectoId: true } }),
      prisma.tercero.findUnique({ where: { id: Number(terceroId) }, select: { id: true } }),
    ]);
    if (!frente) {
      return Response.json({ error: "Frente no encontrado" }, { status: 404 });
    }
    if (frente.proyectoId !== Number(proyectoId)) {
      return Response.json(
        { error: "El frente seleccionado no pertenece al proyecto indicado" },
        { status: 400 }
      );
    }
    if (!tercero) {
      return Response.json({ error: "Tercero no encontrado" }, { status: 404 });
    }

    // Resolver aprobador/responsables igual que la creación normal, para que
    // los otrosís reales que se creen después sobre este contrato queden
    // asignados y notifiquen a alguien.
    const aprobadorConfig = await prisma.aprobadorFrente.findUnique({
      where: { frenteId: Number(firstFrenteId) },
    });
    const parseIdsField = (json: string | null | undefined): string[] => {
      try { return JSON.parse(json ?? "[]"); } catch { return []; }
    };

    let aprobadorId: string | null = parseIdsField(aprobadorConfig?.aprobadorIds)[0] ?? null;
    if (!aprobadorId) {
      if (userRoles.includes("DIRECTOR_PROYECTO")) {
        aprobadorId = session.user.id;
      } else {
        const frenteUsers = await prisma.frenteUsuario.findMany({
          where: { frenteId: Number(firstFrenteId) },
          include: { user: { select: { id: true, roles: true, activo: true } } },
        });
        const aprobadorUser = frenteUsers.find((fu) => {
          try {
            const r: string[] = JSON.parse(fu.user.roles || "[]");
            return r.includes("DIRECTOR_PROYECTO") && fu.user.activo;
          } catch {
            return false;
          }
        });
        aprobadorId = aprobadorUser?.user.id ?? null;
      }
    }

    const { proyAbbr, frenAbbr } = await resolveConsecutivoAbbrs(Number(proyectoId), Number(firstFrenteId));
    const valorEnLetras = valorFinal != null ? numeroALetras(Number(valorFinal)) : null;

    const solicitud = await prisma.$transaction(async (tx) => {
      const key = `${tipo}-${proyAbbr}-${frenAbbr}`;
      const counter = await tx.contadorConsecutivo.upsert({
        where: { tipo: key },
        update: { ultimo: { increment: 1 } },
        create: { tipo: key, anio: new Date().getFullYear(), ultimo: 1 },
      });
      const consecutivo = buildConsecutivo(tipo, proyAbbr, frenAbbr, counter.ultimo);

      const created = await tx.solicitud.create({
        data: {
          consecutivo,
          tipo,
          proyectoId: Number(proyectoId),
          frentesIds: JSON.stringify(frentesIds),
          solicitanteId: session.user.id,
          aprobadorId: aprobadorId ?? null,
          responsableContratosTramiteId: parseIdsField(aprobadorConfig?.contratosTramiteIds)[0] ?? null,
          responsableContratosMinutaId: parseIdsField(aprobadorConfig?.contratosMinutaIds)[0] ?? null,
          coordinadorControlesId: aprobadorConfig?.controlesId ?? null,
          directorControlesId: parseIdsField(aprobadorConfig?.directorControlesIds)[0] ?? null,
          estado: "COMPLETADA",
          importadoHistorico: true,
          terceroId: Number(terceroId),
          valorFinal: valorFinal != null ? Number(valorFinal) : null,
          valorEnLetras,
          cronograma: {
            create: {
              tieneFases: false,
              fechaInicio: inicio,
              fechaFin: fin,
            },
          },
        },
      });

      await tx.historialSolicitud.create({
        data: {
          solicitudId: created.id,
          usuarioId: session.user.id,
          accion: "IMPORTAR_HISTORICO",
          nota: `Contrato histórico importado por ${session.user.name ?? "un usuario"}.`,
        },
      });

      return created;
    });

    return Response.json(solicitud, { status: 201 });
  } catch (error) {
    console.error("POST /api/solicitudes/importar-historico error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
