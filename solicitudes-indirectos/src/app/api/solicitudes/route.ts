import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildConsecutivo, abbreviate, normalizeFrenteName, tienePermiso } from "@/lib/utils";

const ROLES_VER_TODAS: string[] = ["CONTRATOS", "CONTROLES", "DIRECTOR_CONTROLES", "ADMIN"];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const tipo = searchParams.get("tipo");
    const frenteId = searchParams.get("frenteId");
    const proyectoId = searchParams.get("proyectoId");
    const solicitanteId = searchParams.get("solicitanteId");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const solicitudPadreIdParam = searchParams.get("solicitudPadreId");

    const userRoles: string[] = session.user.roles ?? [session.user.rol];
    const userId = session.user.id;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (estado) where.estado = estado;
    if (tipo) where.tipo = tipo;
    if (solicitanteId) where.solicitanteId = solicitanteId;
    if (proyectoId) where.proyectoId = parseInt(proyectoId, 10);
    if (solicitudPadreIdParam) where.solicitudPadreId = parseInt(solicitudPadreIdParam, 10);

    if (fechaDesde || fechaHasta) {
      where.fechaSolicitud = {};
      if (fechaDesde) where.fechaSolicitud.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaSolicitud.lte = new Date(fechaHasta);
    }

    // frenteId filter is applied in-memory below after fetching (frentesIds is stored as JSON string in SQLite)

    // SOLICITANTE and DIRECTOR_PROYECTO only see their own frentes' solicitudes
    // or solicitudes where they are the solicitante or a responsible party.
    let userFrenteIds: number[] = [];
    if (!userRoles.some((r) => ROLES_VER_TODAS.includes(r))) {
      const userFrente = await prisma.frenteUsuario.findMany({
        where: { userId },
        select: { frenteId: true },
      });
      userFrenteIds = userFrente.map((f: { frenteId: number }) => f.frenteId);

      // Optimization: if they have no frentes and are not privileged, they only see their own
      if (userFrenteIds.length === 0) {
        where.solicitanteId = userId;
      } else {
        // Broad query: items they created OR items where they are responsible.
        // We will filter by frentes in-memory because frentesIds is a JSON string.
        where.OR = [
          { solicitanteId: userId },
          { aprobadorId: userId },
          { responsableContratosTramiteId: userId },
          { responsableContratosMinutaId: userId },
          { coordinadorControlesId: userId },
          { directorControlesId: userId },
          // We can't easily do "frentesIds contains any of userFrenteIds" in Prisma with a string JSON field
          // so we'll fetch a bit more and filter in memory.
          // To avoid fetching the whole DB, we could try to filter by proyectoId if we knew which projects
          // their frentes belong to, but that's more complex.
        ];
      }
    }

    let solicitudes = await prisma.solicitud.findMany({
      where,
      include: {
        solicitante: { select: { id: true, nombre: true, cargo: true, email: true } },
        tercero: { select: { id: true, razonSocial: true, nit: true } },
        aprobador: { select: { id: true, nombre: true, cargo: true } },
        _count: { select: { otrosis: true } },
      },
      orderBy: { creadoEn: "desc" },
    });

    // Final granular filtering in-memory
    if (!userRoles.some((r) => ROLES_VER_TODAS.includes(r))) {
      solicitudes = solicitudes.filter((s) => {
        // 1. If I created it or am responsible, I see it (already in DB query, but for safety)
        if (
          s.solicitanteId === userId || 
          s.aprobadorId === userId || 
          s.responsableContratosTramiteId === userId ||
          s.responsableContratosMinutaId === userId ||
          s.coordinadorControlesId === userId ||
          s.directorControlesId === userId
        ) return true;

        // 2. If it belongs to one of my frentes, I see it
        try {
          const sFrenteIds: number[] = JSON.parse(s.frentesIds || "[]");
          return sFrenteIds.some(id => userFrenteIds.includes(id));
        } catch {
          return false;
        }
      });
    }

    // Explicit frenteId filter from query params
    if (frenteId) {
      const fId = parseInt(frenteId, 10);
      solicitudes = solicitudes.filter((s) => {
        try {
          const ids: number[] = JSON.parse(s.frentesIds || "[]");
          return ids.includes(fId);
        } catch {
          return false;
        }
      });
    }

    return Response.json(solicitudes);
  } catch (error) {
    console.error("GET /api/solicitudes error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

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
        { error: "No tienes permiso para crear solicitudes. Contacta al administrador." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      tipo,
      proyectoId,
      frentesIds,
      terceroId,
      descripcionActividad,
      plazoEjecucion,
      formaPago,
      valorFinal,
      tipoContrato,
      asunto,
      creacionTercero,
      alcance,
      terminosReferencia,
      condicionesEspeciales,
      valorEnLetras,
      contratanteNombre,
      contratanteNit,
      archivoCuadroComparativo,
      archivoCotizacion,
      archivoBEP,
      solicitudPadreId,
    } = body;

    // ── Flujo otrosí ────────────────────────────────────────────────────────────
    if (solicitudPadreId) {
      if (!tienePermiso(userRoles, funcionalidadesAdicionales, "crear_otrosi")) {
        return Response.json(
          { error: "No tienes permiso para crear otrosís. Contacta al administrador." },
          { status: 403 }
        );
      }

      const parent = await prisma.solicitud.findUnique({
        where: { id: Number(solicitudPadreId) },
      });

      if (!parent) {
        return Response.json({ error: "Solicitud padre no encontrada" }, { status: 404 });
      }
      if (parent.estado !== "COMPLETADA") {
        return Response.json(
          { error: "Solo se pueden crear otrosís de solicitudes en estado COMPLETADA" },
          { status: 400 }
        );
      }
      if (!tipo || !["OTROSI_TIEMPO", "OTROSI_TIEMPO_CANTIDAD"].includes(tipo)) {
        return Response.json({ error: "Tipo inválido para otrosí" }, { status: 400 });
      }

      const parentFrentesIds: number[] = (() => {
        try { return JSON.parse(parent.frentesIds || "[]"); } catch { return []; }
      })();
      const firstFrenteId = parentFrentesIds[0];

      const [proyectoData, frenteData] = await Promise.all([
        prisma.proyecto.findUnique({
          where: { id: parent.proyectoId },
          select: { nombre: true, codigoConsecutivo: true },
        }),
        firstFrenteId
          ? prisma.frente.findUnique({ where: { id: firstFrenteId }, select: { nombre: true } })
          : Promise.resolve(null),
      ]);

      const proyAbbr =
        proyectoData?.codigoConsecutivo?.trim() ||
        abbreviate(proyectoData?.nombre ?? String(parent.proyectoId), 3);
      const frenAbbr = frenteData
        ? normalizeFrenteName(frenteData.nombre)
        : String(firstFrenteId ?? "");

      const finalValorFinal =
        tipo === "OTROSI_TIEMPO_CANTIDAD" && valorFinal != null
          ? valorFinal
          : parent.valorFinal;
      const finalValorEnLetras =
        tipo === "OTROSI_TIEMPO_CANTIDAD" && valorFinal != null
          ? (valorEnLetras ?? null)
          : parent.valorEnLetras;

      const solicitud = await prisma.$transaction(async (tx) => {
        const key = `${tipo}-${proyAbbr}-${frenAbbr}`;
        const counter = await tx.contadorConsecutivo.upsert({
          where: { tipo: key },
          update: { ultimo: { increment: 1 } },
          create: { tipo: key, anio: new Date().getFullYear(), ultimo: 1 },
        });

        const consecutivo = buildConsecutivo(tipo as string, proyAbbr, frenAbbr, counter.ultimo);

        return tx.solicitud.create({
          data: {
            consecutivo,
            tipo,
            solicitudPadreId: parent.id,
            proyectoId: parent.proyectoId,
            frentesIds: parent.frentesIds,
            solicitanteId: session.user.id,
            aprobadorId: parent.aprobadorId ?? null,
            responsableContratosTramiteId: parent.responsableContratosTramiteId ?? null,
            responsableContratosMinutaId: parent.responsableContratosMinutaId ?? null,
            coordinadorControlesId: parent.coordinadorControlesId ?? null,
            directorControlesId: parent.directorControlesId ?? null,
            estado: "BORRADOR",
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
          },
          include: {
            solicitante: { select: { id: true, nombre: true, cargo: true } },
            tercero: { select: { id: true, razonSocial: true, nit: true } },
          },
        });
      });

      return Response.json(solicitud, { status: 201 });
    }
    // ── Fin flujo otrosí ───────────────────────────────────────────────────────

    if (!tipo || !proyectoId || !frentesIds || frentesIds.length === 0) {
      return Response.json(
        { error: "tipo, proyectoId y frentesIds son obligatorios" },
        { status: 400 }
      );
    }

    // Find configuration for the first frente
    const firstFrenteId = frentesIds[0];
    const config = await prisma.aprobadorFrente.findUnique({
      where: { frenteId: Number(firstFrenteId) }
    });

    let aprobadorId: string | null = config?.aprobadorId ?? null;
    
    // Fallback for first approval: if not configured and the solicitante is themselves a DIRECTOR_PROYECTO, they self-approve;
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

    // Fetch proyecto and frente names for the consecutivo abbreviation
    const [proyectoData, frenteData] = await Promise.all([
      prisma.proyecto.findUnique({ where: { id: Number(proyectoId) }, select: { nombre: true, codigoConsecutivo: true } }),
      prisma.frente.findUnique({ where: { id: Number(firstFrenteId) }, select: { nombre: true } }),
    ]);

    // Use hardcoded code if set, otherwise auto-abbreviate to 3 chars
    const proyAbbr = proyectoData?.codigoConsecutivo?.trim()
      || abbreviate(proyectoData?.nombre ?? String(proyectoId), 3);
    // Full frente name uppercased with no spaces (e.g. "KALA 1" → "KALA1")
    const frenAbbr = normalizeFrenteName(frenteData?.nombre ?? String(firstFrenteId));

    // Transactional consecutive number generation
    const solicitud = await prisma.$transaction(async (tx) => {
      const key = `${tipo}-${proyAbbr}-${frenAbbr}`;
      const counter = await tx.contadorConsecutivo.upsert({
        where: { tipo: key },
        update: { ultimo: { increment: 1 } },
        create: { tipo: key, anio: new Date().getFullYear(), ultimo: 1 },
      });

      const consecutivo = buildConsecutivo(tipo as string, proyAbbr, frenAbbr, counter.ultimo);

      return tx.solicitud.create({
        data: {
          consecutivo,
          tipo,
          proyectoId,
          frentesIds: JSON.stringify(frentesIds || []),
          solicitanteId: session.user.id,
          aprobadorId: aprobadorId ?? null,
          responsableContratosTramiteId: config?.contratosTramiteId ?? null,
          responsableContratosMinutaId: config?.contratosMinutaId ?? null,
          coordinadorControlesId: config?.controlesId ?? null,
          directorControlesId: config?.directorControlesId ?? null,
          estado: "BORRADOR",
          terceroId: terceroId ?? null,
          descripcionActividad: descripcionActividad ?? null,
          plazoEjecucion: plazoEjecucion ?? null,
          formaPago: formaPago ?? null,
          valorFinal: valorFinal ?? null,
          tipoContrato: tipoContrato ?? null,
          asunto: asunto ?? null,
          creacionTercero: creacionTercero ?? false,
          alcance: alcance ?? null,
          terminosReferencia: terminosReferencia ?? null,
          condicionesEspeciales: condicionesEspeciales ?? null,
          valorEnLetras: valorEnLetras ?? null,
          contratanteNombre: contratanteNombre ?? "AED CONSTRUCTORES S.A.S",
          contratanteNit: contratanteNit ?? "901237628-1",
          archivoCuadroComparativo: archivoCuadroComparativo ?? null,
          archivoCotizacion: archivoCotizacion ?? null,
          archivoBEP: archivoBEP ?? null,
        },
        include: {
          solicitante: { select: { id: true, nombre: true, cargo: true } },
          tercero: { select: { id: true, razonSocial: true, nit: true } },
          aprobador: { select: { id: true, nombre: true, cargo: true } },
        },
      });
    });

    return Response.json(solicitud, { status: 201 });
  } catch (error) {
    console.error("POST /api/solicitudes error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
