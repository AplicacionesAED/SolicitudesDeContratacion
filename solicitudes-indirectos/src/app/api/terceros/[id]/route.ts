import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tienePermiso } from "@/lib/utils";

const DD_FIELDS = [
  "dd_identificacionContraparte",
  "dd_consultaListasRestrictivas",
  "dd_verificacionPep",
  "dd_conocimientoNegocio",
  "dd_monitoreoActualizacion",
  "dd_senalesAlertaReporte",
] as const;

// Campos de contacto editables por cualquier usuario autenticado
const CONTACT_FIELDS = new Set([
  "nit",
  "representanteLegal",
  "cedulaRepresentante",
  "correoFirma",
  "direccionRepresentante",
  "telefonoRepresentante",
  "nombreContacto",
  "telefonoContacto",
  "correoContacto",
]);

export async function GET(
  _request: Request,
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

    const tercero = await prisma.tercero.findUnique({
      where: { id: numId },
      include: {
        _count: { select: { solicitudes: true } },
      },
    });

    if (!tercero) {
      return Response.json({ error: "Tercero no encontrado" }, { status: 404 });
    }

    return Response.json(tercero);
  } catch (error) {
    console.error("GET /api/terceros/[id] error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(
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

    const roles = session.user.roles ?? [];
    const funcionalidadesAdicionales = session.user.funcionalidadesAdicionales ?? [];

    const existing = await prisma.tercero.findUnique({ where: { id: numId } });
    if (!existing) {
      return Response.json({ error: "Tercero no encontrado" }, { status: 404 });
    }

    const body = await request.json();

    // Campos de contacto: cualquier usuario autenticado puede editarlos.
    // Cualquier otro campo (DD, SAGRILAFT, etc.) requiere permiso completo.
    const bodyKeys = Object.keys(body);
    const isContactOnlyUpdate = bodyKeys.length > 0 && bodyKeys.every((k) => CONTACT_FIELDS.has(k));

    if (!isContactOnlyUpdate && !tienePermiso(roles, funcionalidadesAdicionales, "editar_terceros")) {
      return Response.json({ error: "No tiene permiso para editar terceros" }, { status: 403 });
    }

    // Auto-set debida diligencia approval only when DD fields are being updated
    const hasDdFields = DD_FIELDS.some((f) => f in body);
    if (hasDdFields) {
      const merged: Record<string, boolean> = {};
      for (const field of DD_FIELDS) {
        merged[field] = field in body ? Boolean(body[field]) : existing[field];
      }
      const allDdTrue = DD_FIELDS.every((f) => merged[f]);
      body.aprobadoDebidaDiligencia = allDdTrue;
    }

    // Prevent direct NIT duplication
    if (body.nit && body.nit !== existing.nit) {
      const dup = await prisma.tercero.findFirst({
        where: { nit: body.nit },
      });
      if (dup) {
        return Response.json({ error: "Ya existe un tercero con ese NIT" }, { status: 409 });
      }
    }

    const updated = await prisma.tercero.update({
      where: { id: numId },
      data: body,
    });

    return Response.json(updated);
  } catch (error) {
    console.error("PATCH /api/terceros/[id] error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
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

    const roles = session.user.roles ?? [];
    const funcionalidadesAdicionales = session.user.funcionalidadesAdicionales ?? [];

    if (!tienePermiso(roles, funcionalidadesAdicionales, "editar_terceros")) {
      return Response.json({ error: "No tiene permiso para eliminar terceros" }, { status: 403 });
    }

    const tercero = await prisma.tercero.findUnique({
      where: { id: numId },
      include: { _count: { select: { solicitudes: true } } },
    });

    if (!tercero) {
      return Response.json({ error: "Tercero no encontrado" }, { status: 404 });
    }

    if (tercero._count.solicitudes > 0) {
      return Response.json(
        { error: "No se puede eliminar un tercero con solicitudes asociadas" },
        { status: 409 }
      );
    }

    await prisma.tercero.delete({ where: { id: numId } });

    return Response.json({ message: "Tercero eliminado exitosamente" });
  } catch (error) {
    console.error("DELETE /api/terceros/[id] error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
