"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { useToast } from "@/shared/ui/toaster";
import {
  CronogramaBuilder,
  type CronogramaData,
} from "@/features/solicitudes/components/cronogramaBuilder";
import {
  formatCurrency,
  formatDate,
  TIPO_SOLICITUD_LABELS,
  numeroALetras,
} from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SolicitudRow {
  id: number;
  consecutivo: string;
  tipo: string;
  valorFinal?: number | string | null;
  fechaSolicitud: string;
  tercero?: { razonSocial: string; nit: string } | null;
}

interface CronogramaDetalle {
  tieneFases: boolean;
  fechaInicio: string;
  fechaFin: string;
  fases: {
    id: number;
    numeroFase: number;
    nombreFase: string;
    fechaInicio: string;
    fechaFin: string;
    actividades: { id: number; descripcion: string; fechaInicio: string; fechaFin: string }[];
  }[];
  actividades: { id: number; descripcion: string; fechaInicio: string; fechaFin: string }[];
}

interface SolicitudDetalle extends SolicitudRow {
  cronograma?: CronogramaDetalle | null;
  otrosis?: {
    id: number;
    estado: string;
    creadoEn: string;
    valorFinal?: number | string | null;
    cronograma: CronogramaDetalle | null;
  }[];
}

export interface OtrosiFormProps {
  tipo: "OTROSI_TIEMPO" | "OTROSI_TIEMPO_CANTIDAD";
}

const defaultCronograma: CronogramaData = {
  tieneFases: false,
  fechaInicio: "",
  fechaFin: "",
  fases: [],
  actividades: [{ descripcion: "", fechaInicio: "", fechaFin: "" }],
};

// ─── Component ────────────────────────────────────────────────────────────────

export function OtrosiForm({ tipo }: OtrosiFormProps) {
  const router = useRouter();
  const { addToast } = useToast();

  // Step 1 — parent selection
  const [solicitudes, setSolicitudes] = useState<SolicitudRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedParent, setSelectedParent] = useState<SolicitudDetalle | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Step 2 — new cronograma
  const [cronograma, setCronograma] = useState<CronogramaData>(defaultCronograma);
  const [cronogramaError, setCronogramaError] = useState("");

  // Step 2b — new value (TIEMPO_CANTIDAD only)
  const [nuevoValor, setNuevoValor] = useState("");
  const [valorError, setValorError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/solicitudes?estado=COMPLETADA")
      .then((r) => r.json())
      .then((data) => setSolicitudes(Array.isArray(data) ? data : []))
      .catch(() => setSolicitudes([]))
      .finally(() => setLoadingList(false));
  }, []);

  const filtered = solicitudes.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.consecutivo.toLowerCase().includes(q) ||
      (s.tercero?.razonSocial ?? "").toLowerCase().includes(q) ||
      (s.tercero?.nit ?? "").toLowerCase().includes(q)
    );
  });

  async function handleSelectParent(row: SolicitudRow) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/solicitudes/${row.id}`);
      if (!res.ok) throw new Error("Error al cargar detalle");
      const data: SolicitudDetalle = await res.json();
      setSelectedParent(data);

      // Find the "vigente" (current) baseline: most recent completed Otrosí, or the parent itself
      const completedOtrosis = (data.otrosis || [])
        .filter((o) => o.estado === "COMPLETADA")
        .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());

      const baseline = completedOtrosis.length > 0 ? completedOtrosis[0] : data;

      // Pre-fill cronograma from baseline if it exists
      if (baseline.cronograma) {
        setCronograma({
          tieneFases: baseline.cronograma.tieneFases,
          fechaInicio: baseline.cronograma.fechaInicio ? new Date(baseline.cronograma.fechaInicio).toISOString().split('T')[0] : "",
          fechaFin: baseline.cronograma.fechaFin ? new Date(baseline.cronograma.fechaFin).toISOString().split('T')[0] : "",
          fases: baseline.cronograma.fases.map(f => ({
            numeroFase: f.numeroFase,
            nombreFase: f.nombreFase,
            fechaInicio: f.fechaInicio ? new Date(f.fechaInicio).toISOString().split('T')[0] : "",
            fechaFin: f.fechaFin ? new Date(f.fechaFin).toISOString().split('T')[0] : "",
            actividades: f.actividades.map(a => ({
              descripcion: a.descripcion,
              fechaInicio: a.fechaInicio ? new Date(a.fechaInicio).toISOString().split('T')[0] : "",
              fechaFin: a.fechaFin ? new Date(a.fechaFin).toISOString().split('T')[0] : "",
            }))
          })),
          actividades: baseline.cronograma.actividades.map(a => ({
            descripcion: a.descripcion,
            fechaInicio: a.fechaInicio ? new Date(a.fechaInicio).toISOString().split('T')[0] : "",
            fechaFin: a.fechaFin ? new Date(a.fechaFin).toISOString().split('T')[0] : "",
          }))
        });
      } else {
        setCronograma(defaultCronograma);
      }

      // Pre-fill nuevoValor if applicable (TIEMPO_CANTIDAD) from baseline
      if (tipo === "OTROSI_TIEMPO_CANTIDAD" && baseline.valorFinal != null) {
        setNuevoValor(String(baseline.valorFinal));
      } else {
        setNuevoValor("");
      }

      setCronogramaError("");
      setValorError("");
    } catch {
      addToast("Error al cargar el detalle del contrato", "error");
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleBack() {
    setSelectedParent(null);
    setCronograma(defaultCronograma);
  }

  async function handleSubmit() {
    let hasError = false;

    if (!cronograma.fechaInicio || !cronograma.fechaFin) {
      setCronogramaError("Debes completar el cronograma con fechas de inicio y fin.");
      hasError = true;
    } else {
      setCronogramaError("");
    }

    if (tipo === "OTROSI_TIEMPO_CANTIDAD") {
      const v = parseFloat(nuevoValor);
      if (!nuevoValor || isNaN(v) || v <= 0) {
        setValorError("Ingresa un valor de contrato válido y mayor a 0.");
        hasError = true;
      } else {
        setValorError("");
      }
    }

    if (hasError || !selectedParent) return;

    setSubmitting(true);
    try {
      const bodyValor =
        tipo === "OTROSI_TIEMPO_CANTIDAD"
          ? {
              valorFinal: parseFloat(nuevoValor),
              valorEnLetras: numeroALetras(parseFloat(nuevoValor)),
            }
          : {};

      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          solicitudPadreId: selectedParent.id,
          ...bodyValor,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast(data.error ?? "Error al crear el otrosí", "error");
        return;
      }

      const cronRes = await fetch(`/api/solicitudes/${data.id}/cronograma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cronograma),
      });

      if (!cronRes.ok) {
        const cronData = await cronRes.json();
        addToast(
          cronData.error ?? "Otrosí creado pero error al guardar el cronograma",
          "error"
        );
        router.push(`/solicitudes/${data.id}`);
        return;
      }

      addToast("Otrosí enviado exitosamente", "success");
      router.push(`/solicitudes/${data.id}`);
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step 1: parent selection ────────────────────────────────────────────────

  if (!selectedParent) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <Link
            href="/solicitudes/nueva"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
          >
            <ArrowLeft size={14} />
            Volver al selector de tipo
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {TIPO_SOLICITUD_LABELS[tipo]}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Selecciona el contrato base al que se aplica este otrosí.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por consecutivo, tercero o NIT..."
                className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loadingList ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
              <span className="ml-2 text-sm text-gray-500">Cargando detalle...</span>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-10">
              No hay contratos completados
              {search ? " que coincidan con la búsqueda" : ""}.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {filtered.map((s) => (
                <li
                  key={s.id}
                  onClick={() => handleSelectParent(s)}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-semibold text-blue-600">
                      {s.consecutivo}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {s.tercero?.razonSocial ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {s.valorFinal != null && (
                      <span className="text-sm font-medium text-gray-700">
                        {formatCurrency(s.valorFinal)}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-gray-400" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ── Step 2: cronograma + optional value ────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ChevronLeft size={14} />
          Cambiar contrato base
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {TIPO_SOLICITUD_LABELS[tipo]}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Contrato base:{" "}
          <span className="font-mono font-semibold text-blue-600">
            {selectedParent.consecutivo}
          </span>
          {selectedParent.tercero && ` — ${selectedParent.tercero.razonSocial}`}
        </p>
      </div>

      {/* Cronograma vigente del padre (referencia) */}
      {selectedParent.cronograma && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Cronograma vigente del contrato base
          </h3>
          <div className="flex flex-wrap gap-4 text-sm text-gray-700 mb-2">
            <span>
              <span className="font-medium">Inicio:</span>{" "}
              {formatDate(selectedParent.cronograma.fechaInicio)}
            </span>
            <span>
              <span className="font-medium">Fin:</span>{" "}
              {formatDate(selectedParent.cronograma.fechaFin)}
            </span>
          </div>
          {selectedParent.cronograma.actividades.length > 0 && (
            <ul className="space-y-1">
              {selectedParent.cronograma.actividades.slice(0, 5).map((a) => (
                <li key={a.id} className="text-xs text-gray-600 flex gap-2">
                  <span className="text-gray-400">•</span>
                  <span className="truncate">{a.descripcion}</span>
                </li>
              ))}
              {selectedParent.cronograma.actividades.length > 5 && (
                <li className="text-xs text-gray-400">
                  + {selectedParent.cronograma.actividades.length - 5} más...
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Nuevo valor (solo OTROSI_TIEMPO_CANTIDAD) */}
      {tipo === "OTROSI_TIEMPO_CANTIDAD" && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Nuevo valor del contrato</h2>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Valor (COP) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={nuevoValor}
              onChange={(e) => {
                setNuevoValor(e.target.value);
                setValorError("");
              }}
              min={0}
              step={0.01}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            {valorError && (
              <p className="text-xs text-red-600 mt-1">{valorError}</p>
            )}
            {nuevoValor &&
              !isNaN(parseFloat(nuevoValor)) &&
              parseFloat(nuevoValor) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {numeroALetras(parseFloat(nuevoValor))}
                </p>
              )}
          </div>
        </div>
      )}

      {/* Nuevo cronograma */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Nuevo Cronograma</h2>
        <CronogramaBuilder
          value={cronograma}
          onChange={(data) => {
            setCronograma(data);
            setCronogramaError("");
          }}
        />
        {cronogramaError && (
          <p className="text-xs text-red-600 mt-2">{cronogramaError}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Link href="/solicitudes">
          <Button variant="secondary" disabled={submitting}>
            Cancelar
          </Button>
        </Link>
        <Button loading={submitting} onClick={handleSubmit}>
          Guardar Otrosí
        </Button>
      </div>
    </div>
  );
}
