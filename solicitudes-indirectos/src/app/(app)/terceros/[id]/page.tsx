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
  Tag,
} from "lucide-react";
import { Spinner } from "@/shared/ui/spinner";
import { Button } from "@/shared/ui/button";
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
  especialidades: { id: number; nombre: string }[];
}

interface Especialidad {
  id: number;
  nombre: string;
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
  const [editingEsp, setEditingEsp] = useState(false);
  const [catalogo, setCatalogo] = useState<Especialidad[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [savingEsp, setSavingEsp] = useState(false);

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

  async function openEditEsp() {
    if (loadingCatalogo) return;
    setLoadingCatalogo(true);
    try {
      const res = await fetch("/api/especialidades", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCatalogo(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoadingCatalogo(false);
    }
    setSelectedIds(tercero?.especialidades.map((e) => e.id) ?? []);
    setEditingEsp(true);
  }

  function toggleId(espId: number) {
    setSelectedIds((prev) =>
      prev.includes(espId) ? prev.filter((x) => x !== espId) : [...prev, espId]
    );
  }

  async function saveEsp() {
    if (!tercero) return;
    setSavingEsp(true);
    try {
      const res = await fetch(`/api/terceros/${tercero.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ especialidadIds: selectedIds }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Error al guardar");
        return;
      }
      const updated = await res.json();
      setTercero((prev) => prev ? { ...prev, especialidades: updated.especialidades } : prev);
      setEditingEsp(false);
    } finally {
      setSavingEsp(false);
    }
  }

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

      {/* Especialidades */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Tag size={14} className="text-gray-400" />
            Especialidades
          </h2>
          {!editingEsp && (
            <button
              onClick={openEditEsp}
              disabled={loadingCatalogo}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            >
              {loadingCatalogo ? "Cargando..." : "Editar"}
            </button>
          )}
        </div>

        {editingEsp ? (
          <div className="space-y-3">
            {catalogo.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                No hay especialidades en el catálogo. Créalas primero desde{" "}
                <a href="/terceros/especialidades" className="text-blue-600 underline">
                  Terceros → Especialidades
                </a>.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {catalogo.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(e.id)}
                      onChange={() => toggleId(e.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{e.nombre}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button onClick={saveEsp} disabled={savingEsp}>
                {savingEsp ? "Guardando..." : "Guardar"}
              </Button>
              <Button variant="secondary" onClick={() => setEditingEsp(false)} disabled={savingEsp}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tercero.especialidades.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Sin especialidades asignadas</p>
            ) : (
              tercero.especialidades.map((e) => (
                <span key={e.id} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {e.nombre}
                </span>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
