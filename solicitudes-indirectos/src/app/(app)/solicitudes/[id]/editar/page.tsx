"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Spinner } from "@/shared/ui/spinner";
import { SolicitudForm } from "@/features/solicitudes/components/solicitudForm";

export default function EditarSolicitudPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const solicitudId = params?.id;

  const [solicitud, setSolicitud] = useState<any | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!solicitudId) return;
    setLoadingData(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/solicitudes/${solicitudId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Solicitud no encontrada");
        throw new Error("Error al cargar solicitud");
      }
      const data = await res.json();

      // Access control
      const userId = session?.user?.id;
      const userRole = session?.user?.rol;
      if (data.solicitanteId !== userId && userRole !== "ADMIN") {
        throw new Error("No tienes permiso para editar esta solicitud");
      }

      // State control
      const estadosEditables = ["BORRADOR", "DEVUELTA", "EN_REVISION"];
      if (!estadosEditables.includes(data.estado)) {
        router.replace(`/solicitudes/${solicitudId}`);
        return;
      }

      setSolicitud(data);
    } catch (e: any) {
      setLoadError(e.message || "Error desconocido");
    } finally {
      setLoadingData(false);
    }
  }, [solicitudId, session, router]);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, loadData]);

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
        <p className="text-sm text-red-600 mb-3">{loadError}</p>
        <button onClick={loadData} className="text-sm text-blue-600 hover:underline">Reintentar</button>
      </div>
    );
  }

  if (!solicitud) return null;

  // Format cronograma for the builder
  const cronogramaData = solicitud.cronograma ? {
    tieneFases: solicitud.cronograma.tieneFases,
    fechaInicio: solicitud.cronograma.fechaInicio ? new Date(solicitud.cronograma.fechaInicio).toISOString().split('T')[0] : "",
    fechaFin: solicitud.cronograma.fechaFin ? new Date(solicitud.cronograma.fechaFin).toISOString().split('T')[0] : "",
    fases: solicitud.cronograma.fases.map((f: any) => ({
      numeroFase: f.numeroFase,
      nombreFase: f.nombreFase,
      fechaInicio: f.fechaInicio ? new Date(f.fechaInicio).toISOString().split('T')[0] : "",
      fechaFin: f.fechaFin ? new Date(f.fechaFin).toISOString().split('T')[0] : "",
      actividades: f.actividades.map((a: any) => ({
        descripcion: a.descripcion,
        fechaInicio: a.fechaInicio ? new Date(a.fechaInicio).toISOString().split('T')[0] : "",
        fechaFin: a.fechaFin ? new Date(a.fechaFin).toISOString().split('T')[0] : "",
      }))
    })),
    actividades: solicitud.cronograma.actividades.map((a: any) => ({
      descripcion: a.descripcion,
      fechaInicio: a.fechaInicio ? new Date(a.fechaInicio).toISOString().split('T')[0] : "",
      fechaFin: a.fechaFin ? new Date(a.fechaFin).toISOString().split('T')[0] : "",
    }))
  } : undefined;

  const tipoSolicitud = solicitud.tipo === "ORDEN_SERVICIO" ? "ORDEN_SERVICIO" : "CONTRATO";

  return (
    <SolicitudForm
      initialData={solicitud}
      initialCronograma={cronogramaData}
      isEdit={true}
      tipoSolicitud={tipoSolicitud}
    />
  );
}
