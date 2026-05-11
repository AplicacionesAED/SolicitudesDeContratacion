"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { Calendar, ChevronDown, ChevronUp, GitMerge } from "lucide-react";
import { formatDate, formatCurrency, TIPO_SOLICITUD_LABELS } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Actividad {
  id: number;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
}

interface Fase {
  id: number;
  numeroFase: number;
  nombreFase: string;
  actividades: Actividad[];
}

interface Cronograma {
  tieneFases: boolean;
  fechaInicio: string;
  fechaFin: string;
  fases: Fase[];
  actividades: Actividad[];
}

interface OtrosiItem {
  id: number;
  consecutivo: string;
  tipo: string;
  estado: string;
  creadoEn: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  valorFinal: any;
  cronograma: Cronograma | null;
}

interface Props {
  originalCronograma: Cronograma | null;
  otrosis: OtrosiItem[];
}

// ─── Cronograma table (shared) ────────────────────────────────────────────────

function CronogramaTable({ cronograma }: { cronograma: Cronograma }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Fecha de inicio
          </p>
          <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
            <Calendar size={14} className="text-gray-400" />
            {cronograma.fechaInicio
              ? formatDate(cronograma.fechaInicio)
              : <span className="text-gray-400 italic">Sin fecha</span>}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Fecha de fin
          </p>
          <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
            <Calendar size={14} className="text-gray-400" />
            {cronograma.fechaFin
              ? formatDate(cronograma.fechaFin)
              : <span className="text-gray-400 italic">Sin fecha</span>}
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Descripción
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-32">
                Inicio
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-32">
                Fin
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cronograma.tieneFases ? (
              cronograma.fases.map((fase) => (
                <Fragment key={fase.id}>
                  <tr className="bg-blue-50/30">
                    <td
                      colSpan={3}
                      className="px-4 py-1.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider"
                    >
                      Fase {fase.numeroFase}: {fase.nombreFase}
                    </td>
                  </tr>
                  {fase.actividades.map((act) => (
                    <tr key={act.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-sm text-gray-700">{act.descripcion}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">
                        {formatDate(act.fechaInicio)}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">
                        {formatDate(act.fechaFin)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))
            ) : cronograma.actividades.length > 0 ? (
              cronograma.actividades.map((act) => (
                <tr key={act.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-sm text-gray-700">{act.descripcion}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">
                    {formatDate(act.fechaInicio)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 font-mono">
                    {formatDate(act.fechaFin)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400 italic">
                  Sin actividades registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CronogramasSection({ originalCronograma, otrosis }: Props) {
  // Newest first
  const sorted = [...otrosis].sort(
    (a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()
  );

  // Vigente = most recent completed otrosí
  const completados = sorted.filter((o) => o.estado === "COMPLETADA");
  const vigenteId = completados.length > 0 ? completados[0].id : null;

  // Default: vigente open, rest closed; if no otrosís, original open
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    if (vigenteId) return { [String(vigenteId)]: true };
    return { original: otrosis.length === 0 };
  });

  function toggle(key: string) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const totalCount = 1 + sorted.length; // original + otrosís

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Section header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <span className="text-sm font-semibold text-gray-900">
          Cronograma
          {sorted.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              {totalCount} versiones
            </span>
          )}
        </span>
        <Calendar size={16} className="text-gray-400" />
      </div>

      <div className="p-5 space-y-3">
        {/* Otrosís — newest first (top) */}
        {sorted.map((otrosi, idx) => {
          const isVigente = otrosi.id === vigenteId;
          const isEnTramite = otrosi.estado !== "COMPLETADA";
          const isOpen = open[String(otrosi.id)] ?? false;
          const otrosiNum = sorted.length - idx;

          return (
            <div
              key={otrosi.id}
              className={`border rounded-xl overflow-hidden ${
                isVigente ? "border-blue-400 shadow-sm" : "border-gray-200"
              }`}
            >
              {/* Card header */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggle(String(otrosi.id))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") toggle(String(otrosi.id));
                }}
                className={`px-4 py-3 flex items-center justify-between cursor-pointer select-none ${
                  isVigente
                    ? "bg-blue-50 border-b border-blue-100"
                    : "bg-gray-50 border-b border-gray-100"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Link
                    href={`/solicitudes/${otrosi.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm font-mono font-semibold text-blue-600 hover:underline shrink-0"
                  >
                    {otrosi.consecutivo}
                  </Link>
                  <span className="text-xs text-gray-500 truncate">
                    Otrosí #{otrosiNum} — {TIPO_SOLICITUD_LABELS[otrosi.tipo] ?? otrosi.tipo}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {otrosi.valorFinal != null && (
                    <span className="text-xs font-medium text-gray-600 hidden sm:inline">
                      {formatCurrency(otrosi.valorFinal)}
                    </span>
                  )}
                  {isVigente && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5">
                      <GitMerge size={9} />
                      Vigente
                    </span>
                  )}
                  {isEnTramite && (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 text-[10px] font-semibold px-2 py-0.5">
                      En trámite
                    </span>
                  )}
                  {isOpen ? (
                    <ChevronUp size={14} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-400" />
                  )}
                </div>
              </div>

              {/* Card body */}
              {isOpen && (
                <div className="p-4">
                  {otrosi.cronograma ? (
                    <CronogramaTable cronograma={otrosi.cronograma} />
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin cronograma registrado.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Original cronograma — always at the bottom */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggle("original")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") toggle("original");
            }}
            className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between cursor-pointer select-none"
          >
            <span className="text-sm font-semibold text-gray-700">
              Cronograma original
            </span>
            {open["original"] ? (
              <ChevronUp size={14} className="text-gray-400" />
            ) : (
              <ChevronDown size={14} className="text-gray-400" />
            )}
          </div>
          {open["original"] && (
            <div className="p-4">
              {originalCronograma ? (
                <CronogramaTable cronograma={originalCronograma} />
              ) : (
                <p className="text-sm text-gray-400 italic">Sin cronograma registrado.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
