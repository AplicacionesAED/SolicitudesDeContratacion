"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { useToast } from "@/shared/ui/toaster";
import { TIPO_SOLICITUD_LABELS } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Frente {
  id: number;
  nombre: string;
  proyectoId: number;
  proyecto: { id: number; nombre: string };
}

interface Tercero {
  id: number;
  razonSocial: string;
  nit: string;
}

interface SolicitudRow {
  id: number;
  consecutivo: string;
  tipo: string;
  tercero?: { razonSocial: string } | null;
}

type Modo = "CONTRATO" | "OTROSI";

const TIPOS_CONTRATO = [
  "CONTRATO",
  "TRAMITE_CUENTA",
  "TRAMITE_FACTURAS",
  "TRAMITE_CUENTAS_RECURRENTES",
  "TRAMITE_CUENTAS_OCASIONALES",
  "TRAMITE_BONIFICACIONES_COMISIONES",
];
const TIPOS_OTROSI = ["OTROSI_TIEMPO", "OTROSI_TIEMPO_CANTIDAD"];

const TIPO_CONTRATO_OPTIONS = TIPOS_CONTRATO.map((t) => ({
  value: t,
  label: TIPO_SOLICITUD_LABELS[t] ?? t,
}));
const TIPO_OTROSI_OPTIONS = TIPOS_OTROSI.map((t) => ({
  value: t,
  label: TIPO_SOLICITUD_LABELS[t] ?? t,
}));

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportarHistoricoForm() {
  const router = useRouter();
  const { addToast } = useToast();

  const [modo, setModo] = useState<Modo>("CONTRATO");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Campos compartidos
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [valorFinal, setValorFinal] = useState("");

  // Modo CONTRATO
  const [tipoContrato, setTipoContrato] = useState("");
  const [frentes, setFrentes] = useState<Frente[]>([]);
  const [frenteId, setFrenteId] = useState("");
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [terceroId, setTerceroId] = useState("");

  // Modo OTROSI
  const [tipoOtrosi, setTipoOtrosi] = useState("OTROSI_TIEMPO");
  const [padres, setPadres] = useState<SolicitudRow[]>([]);
  const [loadingPadres, setLoadingPadres] = useState(true);
  const [padreSearch, setPadreSearch] = useState("");
  const [selectedPadre, setSelectedPadre] = useState<SolicitudRow | null>(null);
  const [numeroOtrosi, setNumeroOtrosi] = useState("");

  useEffect(() => {
    fetch("/api/frentes")
      .then((r) => r.json())
      .then((data) => setFrentes(Array.isArray(data) ? data : []))
      .catch(() => setFrentes([]));

    fetch("/api/terceros?aprobado=true")
      .then((r) => r.json())
      .then((data) => setTerceros(Array.isArray(data) ? data : []))
      .catch(() => setTerceros([]));

    fetch("/api/solicitudes?estado=COMPLETADA")
      .then((r) => r.json())
      .then((data) =>
        setPadres(
          Array.isArray(data) ? data.filter((s: SolicitudRow) => s.tipo !== "ORDEN_SERVICIO") : []
        )
      )
      .catch(() => setPadres([]))
      .finally(() => setLoadingPadres(false));
  }, []);

  const filteredPadres = padres.filter((p) => {
    const q = padreSearch.toLowerCase();
    return (
      p.consecutivo.toLowerCase().includes(q) ||
      (p.tercero?.razonSocial ?? "").toLowerCase().includes(q)
    );
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!fechaInicio) next.fechaInicio = "La fecha de inicio es obligatoria.";
    if (!fechaFin) next.fechaFin = "La fecha de fin es obligatoria.";
    if (fechaInicio && fechaFin && new Date(fechaFin) <= new Date(fechaInicio)) {
      next.fechaFin = "La fecha de fin debe ser posterior a la de inicio.";
    }

    if (modo === "CONTRATO") {
      if (!tipoContrato) next.tipoContrato = "Selecciona el tipo.";
      if (!frenteId) next.frenteId = "Selecciona el frente.";
      if (!terceroId) next.terceroId = "Selecciona el tercero.";
    } else {
      if (!selectedPadre) next.selectedPadre = "Selecciona el contrato al que pertenece.";
      const n = Number(numeroOtrosi);
      if (!numeroOtrosi || !Number.isInteger(n) || n <= 0) {
        next.numeroOtrosi = "Ingresa un número entero de otrosí válido.";
      }
      if (tipoOtrosi === "OTROSI_TIEMPO_CANTIDAD" && !valorFinal) {
        next.valorFinal = "Ingresa el nuevo valor del contrato.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const body =
        modo === "CONTRATO"
          ? {
              modo,
              tipo: tipoContrato,
              terceroId: Number(terceroId),
              proyectoId: frentes.find((f) => f.id === Number(frenteId))?.proyectoId,
              frentesIds: [Number(frenteId)],
              valorFinal: valorFinal ? Number(valorFinal) : null,
              fechaInicio,
              fechaFin,
            }
          : {
              modo,
              tipo: tipoOtrosi,
              solicitudPadreId: selectedPadre!.id,
              numeroOtrosi: Number(numeroOtrosi),
              valorFinal: valorFinal ? Number(valorFinal) : null,
              fechaInicio,
              fechaFin,
            };

      const res = await fetch("/api/solicitudes/importar-historico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast(data.error ?? "Error al importar el registro histórico", "error");
        return;
      }

      addToast("Registro histórico importado correctamente", "success");
      router.push(`/solicitudes/${data.id}`);
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <Link
          href="/solicitudes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Importar registro histórico</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Registra un contrato o un otrosí anterior a este sistema, ya completado, para
          poder crear otrosís reales sobre él.
        </p>
      </div>

      {/* Selector de modo */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">¿Qué vas a importar?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setModo("CONTRATO")}
            className={`text-left rounded-lg border p-4 transition-colors ${
              modo === "CONTRATO" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">Un contrato o trámite original</p>
            <p className="text-xs text-gray-500 mt-0.5">No existe todavía en el sistema.</p>
          </button>
          <button
            type="button"
            onClick={() => setModo("OTROSI")}
            className={`text-left rounded-lg border p-4 transition-colors ${
              modo === "OTROSI" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">Un otrosí de un contrato existente</p>
            <p className="text-xs text-gray-500 mt-0.5">
              El contrato ya está en el sistema (nativo o importado).
            </p>
          </button>
        </div>
      </div>

      {modo === "CONTRATO" ? (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <Select
            label="Tipo"
            required
            placeholder="Selecciona un tipo"
            options={TIPO_CONTRATO_OPTIONS}
            value={tipoContrato}
            onChange={(e) => setTipoContrato(e.target.value)}
            error={errors.tipoContrato}
          />
          <Select
            label="Frente"
            required
            placeholder="Selecciona un frente"
            options={frentes.map((f) => ({
              value: String(f.id),
              label: `${f.nombre} — ${f.proyecto.nombre}`,
            }))}
            value={frenteId}
            onChange={(e) => setFrenteId(e.target.value)}
            error={errors.frenteId}
          />
          <Select
            label="Tercero"
            required
            placeholder="Selecciona un tercero"
            options={terceros.map((t) => ({ value: String(t.id), label: `${t.razonSocial} — ${t.nit}` }))}
            value={terceroId}
            onChange={(e) => setTerceroId(e.target.value)}
            error={errors.terceroId}
          />
          <Input
            label="Valor final (COP)"
            type="number"
            min={0}
            value={valorFinal}
            onChange={(e) => setValorFinal(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de inicio"
              type="date"
              required
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              error={errors.fechaInicio}
            />
            <Input
              label="Fecha de fin"
              type="date"
              required
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              error={errors.fechaFin}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Contrato base <span className="text-red-500">*</span>
            </label>
            {selectedPadre ? (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <div>
                  <p className="text-sm font-mono font-semibold text-blue-700">
                    {selectedPadre.consecutivo}
                  </p>
                  <p className="text-xs text-gray-500">{selectedPadre.tercero?.razonSocial ?? "—"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPadre(null)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={padreSearch}
                      onChange={(e) => setPadreSearch(e.target.value)}
                      placeholder="Buscar por consecutivo o tercero..."
                      className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {loadingPadres ? (
                  <div className="flex items-center justify-center py-6">
                    <Spinner size="sm" />
                  </div>
                ) : filteredPadres.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-6">
                    No hay contratos completados disponibles.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                    {filteredPadres.map((p) => (
                      <li
                        key={p.id}
                        onClick={() => setSelectedPadre(p)}
                        className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-blue-50"
                      >
                        <span className="font-mono font-semibold text-blue-600">{p.consecutivo}</span>
                        <span className="text-xs text-gray-500">{p.tercero?.razonSocial ?? "—"}</span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {errors.selectedPadre && <p className="text-xs text-red-500 mt-1">{errors.selectedPadre}</p>}
          </div>

          <Select
            label="Tipo de otrosí"
            required
            options={TIPO_OTROSI_OPTIONS}
            value={tipoOtrosi}
            onChange={(e) => setTipoOtrosi(e.target.value)}
          />
          <Input
            label="Número de otrosí"
            type="number"
            min={1}
            required
            placeholder="Ej. 4"
            value={numeroOtrosi}
            onChange={(e) => setNumeroOtrosi(e.target.value)}
            error={errors.numeroOtrosi}
          />
          {tipoOtrosi === "OTROSI_TIEMPO_CANTIDAD" && (
            <Input
              label="Nuevo valor del contrato (COP)"
              type="number"
              min={0}
              required
              value={valorFinal}
              onChange={(e) => setValorFinal(e.target.value)}
              error={errors.valorFinal}
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de inicio"
              type="date"
              required
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              error={errors.fechaInicio}
            />
            <Input
              label="Fecha de fin"
              type="date"
              required
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              error={errors.fechaFin}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/solicitudes">
          <Button variant="secondary" disabled={submitting}>
            Cancelar
          </Button>
        </Link>
        <Button loading={submitting} onClick={handleSubmit}>
          Importar
        </Button>
      </div>
    </div>
  );
}
