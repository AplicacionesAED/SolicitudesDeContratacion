import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tienePermiso } from "@/lib/utils";
import {
  notificarNuevaSolicitud,
  notificarAprobadaDirector,
  notificarDevuelta,
  notificarEnRevision,
  notificarControles,
  notificarAdproRegistrado,
  notificarCompletada,
} from "@/lib/notifications";
type AccionEstado =
  | "ENVIAR"
  | "APROBAR_DIRECTOR_TECNICO"
  | "APROBAR_DIRECTOR"
  | "DEVOLVER"
  | "REVISAR"
  | "TRAMITAR_OK"
  | "AVANZAR_CONTRATOS"
  | "PASAR_CONTROLES"
  | "REGISTRAR_ADPRO"
  | "APROBAR_FINAL"
  | "REENVIAR";

interface TransicionConfig {
  estadosOrigen: string[];
  permisosPermitidos: string[];
}

const TRANSICIONES: Record<AccionEstado, TransicionConfig> = {
  ENVIAR: {
    estadosOrigen: ["BORRADOR"],
    permisosPermitidos: ["crear_enviar_solicitudes"],
  },
  APROBAR_DIRECTOR_TECNICO: {
    estadosOrigen: ["PENDIENTE_DIRECTOR_TECNICO"],
    permisosPermitidos: ["aprobar_director_tecnico"],
  },
  APROBAR_DIRECTOR: {
    estadosOrigen: ["ENVIADA"],
    permisosPermitidos: ["aprobar_solicitudes_frente"],
  },
  DEVOLVER: {
    estadosOrigen: ["PENDIENTE_DIRECTOR_TECNICO", "ENVIADA", "EN_TRAMITE_CONTRATOS"],
    permisosPermitidos: ["aprobar_director_tecnico", "aprobar_solicitudes_frente", "revisar_contratos"],
  },
  REVISAR: {
    estadosOrigen: ["APROBADA_DIRECTOR", "EN_TRAMITE_CONTRATOS"],
    permisosPermitidos: ["revisar_contratos"],
  },
  TRAMITAR_OK: {
    estadosOrigen: ["EN_TRAMITE_CONTRATOS", "APROBADA_DIRECTOR"],
    permisosPermitidos: ["revisar_contratos"],
  },
  AVANZAR_CONTRATOS: {
    estadosOrigen: ["CREACION_MINUTA"],
    permisosPermitidos: ["revisar_contratos"],
  },
  PASAR_CONTROLES: {
    estadosOrigen: ["ENVIO_CONTRATO_POLIZAS"],
    permisosPermitidos: ["revisar_contratos"],
  },
  REGISTRAR_ADPRO: {
    estadosOrigen: ["EN_CONTROLES"],
    permisosPermitidos: ["registrar_adpro"],
  },
  APROBAR_FINAL: {
    estadosOrigen: ["APROBACION_FINAL"],
    permisosPermitidos: ["aprobacion_final"],
  },
  REENVIAR: {
    estadosOrigen: ["DEVUELTA", "EN_REVISION"],
    permisosPermitidos: ["crear_enviar_solicitudes"],
  },
};

const ESTADO_DESTINO: Record<AccionEstado, string> = {
  ENVIAR: "ENVIADA",
  APROBAR_DIRECTOR_TECNICO: "ENVIADA",
  APROBAR_DIRECTOR: "EN_TRAMITE_CONTRATOS",
  DEVOLVER: "DEVUELTA",
  REVISAR: "EN_REVISION",
  TRAMITAR_OK: "CREACION_MINUTA",
  AVANZAR_CONTRATOS: "EN_CONTROLES",
  PASAR_CONTROLES: "EN_CONTROLES",
  REGISTRAR_ADPRO: "APROBACION_FINAL",
  APROBAR_FINAL: "COMPLETADA",
  REENVIAR: "ENVIADA",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const {
      accion,
      nota,
      estadoContratacion,
      numeroContratoAdpro,
    }: {
      accion: AccionEstado;
      nota?: string;
      estadoContratacion?: string;
      numeroContratoAdpro?: string;
    } = body;

    if (!accion) {
      return Response.json({ error: "accion es requerida" }, { status: 400 });
    }

    const transicion = TRANSICIONES[accion];
    if (!transicion) {
      return Response.json({ error: `Acción desconocida: ${accion}` }, { status: 400 });
    }

    const userRoles: string[] = session.user.roles ?? [session.user.rol];
    const funcionalidadesAdicionales: string[] = session.user.funcionalidadesAdicionales ?? [];
    const userId = session.user.id;

    // Validate permission
    const tieneAlgunPermiso = transicion.permisosPermitidos.some((p) =>
      tienePermiso(userRoles, funcionalidadesAdicionales, p)
    );

    if (!tieneAlgunPermiso) {
      return Response.json(
        { error: `No tienes permiso para ejecutar la acción ${accion}` },
        { status: 403 }
      );
    }

    // Load solicitud with relations
    const solicitud = await prisma.solicitud.findUnique({
      where: { id: numId },
      include: {
        solicitante: { select: { id: true, nombre: true, roles: true } },
        aprobador: { select: { id: true, nombre: true } },
      },
    });

    if (!solicitud) {
      return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    // Validate current state
    if (!transicion.estadosOrigen.includes(solicitud.estado)) {
      return Response.json(
        {
          error: `La solicitud está en estado ${solicitud.estado} y no puede ejecutar ${accion}`,
        },
        { status: 409 }
      );
    }

    // ── Per-action validations ─────────────────────────────────────────────────

    if (accion === "ENVIAR") {
      const requiredFields = [
        "tipo",
        "terceroId",
        "descripcionActividad",
        "plazoEjecucion",
        "formaPago",
        "valorFinal",
      ] as const;
      for (const field of requiredFields) {
        if (!solicitud[field]) {
          return Response.json(
            { error: `El campo ${field} es obligatorio para enviar` },
            { status: 400 }
          );
        }
      }
      if (solicitud.tipo === "CONTRATO" && !solicitud.tipoContrato) {
        return Response.json(
          { error: "El campo tipoContrato es obligatorio para enviar un contrato" },
          { status: 400 }
        );
      }
      const frentesArr: number[] = JSON.parse(solicitud.frentesIds || "[]");
      if (frentesArr.length === 0) {
        return Response.json(
          { error: "Debe seleccionar al menos un frente" },
          { status: 400 }
        );
      }
    }

    if (accion === "APROBAR_DIRECTOR") {
      // Must be the assigned aprobador (Director de Proyecto)
      if (solicitud.aprobadorId && solicitud.aprobadorId !== userId && !userRoles.includes("ADMIN")) {
        return Response.json(
          { error: "Solo el director de proyecto asignado puede aprobar esta solicitud" },
          { status: 403 }
        );
      }
    }

    if (accion === "DEVOLVER" || accion === "REVISAR") {
      if (!nota || nota.trim() === "") {
        return Response.json(
          { error: "Se requiere una nota para esta acción" },
          { status: 400 }
        );
      }
    }

    if (accion === "REENVIAR") {
      // Only the original solicitante
      if (solicitud.solicitanteId !== userId) {
        return Response.json(
          { error: "Solo el solicitante original puede reenviar la solicitud" },
          { status: 403 }
        );
      }
    }

    if (accion === "TRAMITAR_OK" || (accion === "DEVOLVER" && solicitud.estado === "EN_TRAMITE_CONTRATOS") || (accion === "REVISAR" && solicitud.estado === "EN_TRAMITE_CONTRATOS")) {
      // Must be the assigned Contratos user for Tramite
      if (solicitud.responsableContratosTramiteId && solicitud.responsableContratosTramiteId !== userId && !userRoles.includes("ADMIN")) {
        return Response.json(
          { error: "Solo el responsable de contratos asignado para el trámite puede realizar esta acción" },
          { status: 403 }
        );
      }
    }

    if (accion === "AVANZAR_CONTRATOS") {
      // Must be the assigned Contratos user for Minuta
      if (solicitud.responsableContratosMinutaId && solicitud.responsableContratosMinutaId !== userId && !userRoles.includes("ADMIN")) {
        return Response.json(
          { error: "Solo el responsable de contratos asignado para la creación de minuta puede realizar esta acción" },
          { status: 403 }
        );
      }

      const anexos: unknown[] = (() => { try { return JSON.parse(solicitud.archivosAnexos || "[]"); } catch { return []; } })();
      if (anexos.length === 0) {
        return Response.json(
          { error: "Debe adjuntar al menos un documento en Anexos de la solicitud antes de continuar" },
          { status: 400 }
        );
      }
    }

    if (accion === "REGISTRAR_ADPRO") {
      if (!numeroContratoAdpro || numeroContratoAdpro.trim() === "") {
        return Response.json(
          { error: "Se requiere el número de contrato Adpro" },
          { status: 400 }
        );
      }
    }

    if (accion === "APROBAR_FINAL") {
      // Must be the assigned Director de Controles
      if (solicitud.directorControlesId && solicitud.directorControlesId !== userId && !userRoles.includes("ADMIN")) {
        return Response.json(
          { error: "Solo el director de controles asignado puede dar la aprobación final" },
          { status: 403 }
        );
      }
    }

    // ── Build update data ──────────────────────────────────────────────────────
    let estadoDestino = ESTADO_DESTINO[accion];

    // Si el solicitante es Coordinador de Técnica, ENVIAR va a aprobación del Director Técnico primero
    if (accion === "ENVIAR") {
      const solicitanteRoles: string[] = (() => {
        try { return JSON.parse((solicitud.solicitante as any).roles || "[]"); } catch { return []; }
      })();
      if (solicitanteRoles.includes("TECNICA")) {
        estadoDestino = "PENDIENTE_DIRECTOR_TECNICO";
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { estado: estadoDestino };

    if (accion === "APROBAR_DIRECTOR") {
      updateData.fechaAprobacionDirector = new Date();
    }

    if (accion === "REVISAR") {
      updateData.necesitaRevision = true;
      updateData.notaContratacion = nota;
    }

    if (accion === "DEVOLVER") {
      updateData.notaContratacion = nota;
    }

    if (accion === "REGISTRAR_ADPRO") {
      updateData.numeroContratoAdpro = numeroContratoAdpro;
    }

    if (estadoContratacion) {
      updateData.notaContratacion = estadoContratacion;
    }

    // ── Execute transition in transaction ──────────────────────────────────────
    const updated = await prisma.$transaction(async (tx) => {
      const sol = await tx.solicitud.update({
        where: { id: numId },
        data: updateData,
      });

      await tx.historialSolicitud.create({
        data: {
          solicitudId: numId,
          usuarioId: userId,
          accion,
          nota: nota ?? null,
        },
      });

      // Si se completa un OTROSI_TIEMPO_CANTIDAD, actualizar valorFinal del padre
      if (
        estadoDestino === "COMPLETADA" &&
        solicitud.tipo === "OTROSI_TIEMPO_CANTIDAD" &&
        solicitud.solicitudPadreId != null &&
        sol.valorFinal != null
      ) {
        await tx.solicitud.update({
          where: { id: solicitud.solicitudPadreId },
          data: { valorFinal: sol.valorFinal },
        });
      }

      return sol;
    });

    // ── Send notifications (outside transaction) ───────────────────────────────
    try {
      if (accion === "ENVIAR") {
        if (estadoDestino === "PENDIENTE_DIRECTOR_TECNICO") {
          // Notificar a todos los usuarios con rol DIRECTOR_TECNICO
          const directoresTecnicos = await prisma.user.findMany({
            where: { activo: true },
            select: { id: true, roles: true },
          });
          for (const dt of directoresTecnicos) {
            const roles: string[] = (() => { try { return JSON.parse(dt.roles || "[]"); } catch { return []; } })();
            if (roles.includes("DIRECTOR_TECNICO")) {
              await notificarNuevaSolicitud(numId, solicitud.solicitante.nombre, solicitud.consecutivo, dt.id);
            }
          }
        } else if (solicitud.aprobadorId) {
          await notificarNuevaSolicitud(numId, solicitud.solicitante.nombre, solicitud.consecutivo, solicitud.aprobadorId);
        }
      }

      if (accion === "APROBAR_DIRECTOR_TECNICO" && solicitud.aprobadorId) {
        // Después de aprobar Director Técnico, notificar al Director de Proyecto asignado
        await notificarNuevaSolicitud(numId, solicitud.solicitante.nombre, solicitud.consecutivo, solicitud.aprobadorId);
      }

      if (accion === "APROBAR_DIRECTOR") {
        // Notify solicitante + assigned CONTRATOS user for Tramite
        await notificarAprobadaDirector(
          numId,
          solicitud.consecutivo,
          solicitud.solicitanteId,
          updated.responsableContratosTramiteId ?? ""
        );
      }

      if (accion === "DEVOLVER" && nota) {
        await notificarDevuelta(
          numId,
          solicitud.consecutivo,
          solicitud.solicitanteId,
          nota
        );
      }

      if (accion === "REVISAR" && nota) {
        await notificarEnRevision(
          numId,
          solicitud.consecutivo,
          solicitud.solicitanteId,
          nota
        );
      }

      if (accion === "AVANZAR_CONTRATOS" || accion === "PASAR_CONTROLES") {
        if (updated.coordinadorControlesId) {
          await notificarControles(numId, solicitud.consecutivo, updated.coordinadorControlesId);
        }
      }

      if (accion === "REGISTRAR_ADPRO") {
        if (updated.directorControlesId) {
          await notificarAdproRegistrado(numId, solicitud.consecutivo, updated.directorControlesId);
        }
      }

      if (accion === "APROBAR_FINAL") {
        const involucrados = [solicitud.solicitanteId];
        if (solicitud.aprobadorId) involucrados.push(solicitud.aprobadorId);
        await notificarCompletada(numId, solicitud.consecutivo, involucrados);
      }
    } catch (notifError) {
      // Notifications are non-critical; log but do not fail the request
      console.error("Error al enviar notificaciones:", notifError);
    }

    return Response.json(updated);
  } catch (error) {
    console.error("POST /api/solicitudes/[id]/estado error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
