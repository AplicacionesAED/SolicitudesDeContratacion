"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  CalendarDays,
} from "lucide-react";
import { countBusinessDays, getMinStartDate } from "@/lib/holidays";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActividadData {
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  responsable?: string;
}

export interface FaseData {
  numeroFase: number;
  nombreFase: string;
  fechaInicio: string;
  fechaFin: string;
  actividades: ActividadData[];
}

export interface CronogramaData {
  tieneFases: boolean;
  fechaInicio: string;
  fechaFin: string;
  fases: FaseData[];
  actividades: ActividadData[];
}

interface CronogramaBuilderProps {
  value: CronogramaData;
  onChange: (data: CronogramaData) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toInputDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function emptyActividad(): ActividadData {
  return { descripcion: "", fechaInicio: "", fechaFin: "" };
}


function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function calcDuration(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  if (e <= s) return 0;
  return countBusinessDays(s, e);
}

// ─── Actividades Table ────────────────────────────────────────────────────────

function ActividadesTable({
  actividades,
  onChange,
  minDate,
  maxDate,
}: {
  actividades: ActividadData[];
  onChange: (acts: ActividadData[]) => void;
  minDate?: string;
  maxDate?: string;
}) {
  function updateRow(idx: number, field: keyof ActividadData, val: string) {
    const next = actividades.map((a, i) => (i === idx ? { ...a, [field]: val } : a));
    onChange(next);
  }

  function addRow() {
    const cleared = actividades.map((a, i) =>
      i === actividades.length - 1 ? { ...a, fechaFin: "" } : a
    );
    onChange([...cleared, { ...emptyActividad(), fechaFin: maxDate ?? "" }]);
  }

  function removeRow(idx: number) {
    if (actividades.length <= 1) return;
    onChange(actividades.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600 w-[50%]">Descripción</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 w-[22%]">Fecha Inicio</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 w-[22%]">Fecha Fin</th>
              <th className="px-3 py-2 w-[6%]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {actividades.map((act, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={act.descripcion}
                    onChange={(e) => updateRow(idx, "descripcion", e.target.value)}
                    placeholder="Descripción de la actividad"
                    className="w-full rounded border-0 bg-transparent px-1 py-0.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="date"
                    value={act.fechaInicio}
                    min={minDate}
                    max={maxDate}
                    onChange={(e) => updateRow(idx, "fechaInicio", e.target.value)}
                    className="w-full rounded border-0 bg-transparent px-1 py-0.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="date"
                    value={act.fechaFin}
                    min={act.fechaInicio || minDate}
                    max={maxDate}
                    onChange={(e) => updateRow(idx, "fechaFin", e.target.value)}
                    className="w-full rounded border-0 bg-transparent px-1 py-0.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    disabled={actividades.length <= 1}
                    className="text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                    title="Eliminar actividad"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={addRow}>
        <Plus size={14} />
        Agregar actividad
      </Button>
    </div>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────

export function CronogramaBuilder({ value, onChange }: CronogramaBuilderProps) {
  const minStartDate = toInputDate(getMinStartDate());
  const minStartDisplay = formatDisplayDate(minStartDate);

  const totalDays = calcDuration(value.fechaInicio, value.fechaFin);

  const fechaInicioError =
    value.fechaInicio && value.fechaInicio < minStartDate
      ? `La fecha de inicio debe ser mínimo el ${minStartDisplay}, considerando 13 días hábiles desde hoy.`
      : "";

  const fechaFinError =
    value.fechaFin && value.fechaInicio && value.fechaFin <= value.fechaInicio
      ? "La fecha de fin debe ser posterior a la fecha de inicio."
      : "";

  // ── Mutations ────────────────────────────────────────────────────────────────

  function set<K extends keyof CronogramaData>(key: K, val: CronogramaData[K]) {
    onChange({ ...value, [key]: val });
  }

  function setFechaInicio(fecha: string) {
    const actividades = value.actividades.map((a, i) =>
      i === 0 ? { ...a, fechaInicio: fecha } : a
    );
    onChange({ ...value, fechaInicio: fecha, actividades });
  }

  function setFechaFin(fecha: string) {
    const last = value.actividades.length - 1;
    const actividades = value.actividades.map((a, i) =>
      i === last ? { ...a, fechaFin: fecha } : a
    );
    onChange({ ...value, fechaFin: fecha, actividades });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Global dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Input
            type="date"
            label="Fecha de inicio del contrato"
            required
            value={value.fechaInicio}
            min={minStartDate}
            onChange={(e) => setFechaInicio(e.target.value)}
            error={fechaInicioError}
          />
          {!fechaInicioError && (
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <CalendarDays size={11} />
              Mínimo: {minStartDisplay} (13 días hábiles desde hoy)
            </p>
          )}
        </div>
        <Input
          type="date"
          label="Fecha de fin del contrato"
          required
          value={value.fechaFin}
          min={value.fechaInicio || minStartDate}
          onChange={(e) => setFechaFin(e.target.value)}
          error={fechaFinError}
        />
      </div>

      {/* Duration badge */}
      {totalDays > 0 && (
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <CalendarDays size={15} />
          <span>
            Duración total: <strong>{totalDays} días hábiles</strong>
          </span>
        </div>
      )}

      {/* Actividades */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Actividades del contrato</p>
        <ActividadesTable
          actividades={value.actividades}
          onChange={(acts) => set("actividades", acts)}
          minDate={value.fechaInicio || minStartDate}
          maxDate={value.fechaFin}
        />
      </div>

    </div>
  );
}
