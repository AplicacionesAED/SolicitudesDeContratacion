"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
} from "lucide-react";
import { Spinner } from "@/shared/ui/spinner";
import { useSession } from "next-auth/react";
import { formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tercero {
  id: number;
  razonSocial: string;
  nit: string;
  representanteLegal: string;
  cedulaRepresentante: string;
  correoFirma: string;
  direccionRepresentante: string;
  telefonoRepresentante: string;
  nombreContacto?: string | null;
  telefonoContacto?: string | null;
  correoContacto?: string | null;
  tipoContrato: string;
  fechaVencimientoSagrilaft?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

interface SolicitudSimple {
  id: number;
  consecutivo: string;
  tipo: string;
  estado: string;
  fechaSolicitud: string;
  valorFinal?: number | string | null;
  solicitante: { nombre: string };
}

const TIPO_CONTRATO_LABEL: Record<string, string> = {
  OBRA: "Otros Servicios",
  DISENO: "Diseño",
  SERVICIOS: "Servicios",
};

// ─── Info row helper ──────────────────────────────────────────────────────────

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 shrink-0">
          <Icon size={13} className="text-gray-500" />
        </div>
      )}
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">
          {label}
        </p>
        <p className="text-sm text-gray-900">
          {value || <span className="text-gray-400 italic">—</span>}
        </p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TerceroDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const id = params?.id as string;

  const [tercero, setTercero] = useState<Tercero | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const terceroRes = await fetch(`/api/terceros/${id}`, { cache: "no-store" });

      if (terceroRes.status === 404) {
        router.push("/terceros");
        return;
      }

      if (terceroRes.ok) {
        const data: Tercero = await terceroRes.json();
        setTercero(data);
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="md" />
        <span className="ml-3 text-sm text-gray-500">Cargando tercero...</span>
      </div>
    );
  }

  if (!tercero) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back + header */}
      <div>
        <Link
          href="/terceros"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver a Terceros
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {tercero.razonSocial}
            </h1>
            <p className="text-sm text-gray-500 font-mono mt-0.5">{tercero.nit}</p>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Datos básicos */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Datos del Tercero</h2>
          <InfoItem label="Razón Social" value={tercero.razonSocial} icon={Building2} />
          <InfoItem label="NIT" value={tercero.nit} icon={CreditCard} />
          <InfoItem
            label="Tipo de Contrato"
            value={TIPO_CONTRATO_LABEL[tercero.tipoContrato] ?? tercero.tipoContrato}
            icon={FileText}
          />
          <InfoItem
            label="Vcto. SAGRILAFT"
            value={tercero.fechaVencimientoSagrilaft ? formatDate(tercero.fechaVencimientoSagrilaft) : undefined}
            icon={FileText}
          />
        </div>

        {/* Representante Legal */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Representante Legal
          </h2>
          <InfoItem
            label="Nombre"
            value={tercero.representanteLegal}
            icon={User}
          />
          <InfoItem
            label="Cédula"
            value={tercero.cedulaRepresentante}
            icon={CreditCard}
          />
          <InfoItem
            label="Correo Firma"
            value={tercero.correoFirma}
            icon={Mail}
          />
          <InfoItem
            label="Dirección"
            value={tercero.direccionRepresentante}
            icon={MapPin}
          />
          <InfoItem
            label="Teléfono"
            value={tercero.telefonoRepresentante}
            icon={Phone}
          />
        </div>
      </div>

      {/* Contacto */}
      {(tercero.nombreContacto ||
        tercero.telefonoContacto ||
        tercero.correoContacto) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Contacto Comercial
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoItem
              label="Nombre"
              value={tercero.nombreContacto}
              icon={User}
            />
            <InfoItem
              label="Teléfono"
              value={tercero.telefonoContacto}
              icon={Phone}
            />
            <InfoItem
              label="Correo"
              value={tercero.correoContacto}
              icon={Mail}
            />
          </div>
        </div>
      )}
    </div>
  );
}
