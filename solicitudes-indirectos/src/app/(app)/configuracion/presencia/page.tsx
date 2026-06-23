"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Activity, RefreshCw } from "lucide-react";
import { Spinner } from "@/shared/ui/spinner";
import { ROL_LABELS, formatDateTime } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Estado = "activo" | "ausente" | "desconectado";

interface UsuarioPresencia {
  id: string;
  nombre: string;
  email: string;
  cargo: string | null;
  roles: string[];
  ultimaConexion: string | null;
  ultimaActividad: string | null;
  estado: Estado;
}

// Cada cuánto se refresca la lista automáticamente.
const REFRESCO_MS = 15_000;

const ESTADO_CONFIG: Record<Estado, { label: string; dot: string; pill: string; orden: number }> = {
  activo: {
    label: "Activo",
    dot: "bg-green-500",
    pill: "bg-green-50 text-green-700",
    orden: 0,
  },
  ausente: {
    label: "Ausente",
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-700",
    orden: 1,
  },
  desconectado: {
    label: "Desconectado",
    dot: "bg-gray-300",
    pill: "bg-gray-100 text-gray-500",
    orden: 2,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tiempoRelativo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Hace instantes";
  if (mins < 60) return `Hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} día${dias !== 1 ? "s" : ""}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PresenciaPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.rol;

  const [usuarios, setUsuarios] = useState<UsuarioPresencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ultimoRefresco, setUltimoRefresco] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/presence");
      if (!res.ok) throw new Error("Error al cargar la presencia");
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
      setUltimoRefresco(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const intervalo = setInterval(fetchData, REFRESCO_MS);
    return () => clearInterval(intervalo);
  }, [fetchData]);

  const conteos = usuarios.reduce(
    (acc, u) => {
      acc[u.estado]++;
      return acc;
    },
    { activo: 0, ausente: 0, desconectado: 0 } as Record<Estado, number>
  );

  const ordenados = [...usuarios].sort((a, b) => {
    const d = ESTADO_CONFIG[a.estado].orden - ESTADO_CONFIG[b.estado].orden;
    return d !== 0 ? d : a.nombre.localeCompare(b.nombre);
  });

  if (userRole && userRole !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-sm">
          <Activity size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            No tienes permiso para acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <Link
          href="/configuracion"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver a Configuración
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Actividad de usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Estado de presencia en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <RefreshCw size={13} className="animate-spin [animation-duration:3s]" />
          {ultimoRefresco
            ? `Actualizado ${ultimoRefresco.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
            : "Actualizando…"}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(ESTADO_CONFIG) as Estado[]).map((estado) => (
          <div key={estado} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${ESTADO_CONFIG[estado].dot}`} />
              <span className="text-xs font-medium text-gray-500">{ESTADO_CONFIG[estado].label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1.5">{conteos[estado]}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={fetchData} className="mt-3 text-sm text-blue-600 hover:underline">
              Reintentar
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Estado", "Nombre", "Perfiles", "Última actividad", "Última conexión"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ordenados.map((u) => {
                  const cfg = ESTADO_CONFIG[u.estado];
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.pill}`}>
                          <span className={`h-2 w-2 rounded-full ${cfg.dot} ${u.estado === "activo" ? "animate-pulse" : ""}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">{u.nombre}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(u.roles) ? u.roles : []).map((r) => (
                            <span
                              key={r}
                              className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 whitespace-nowrap"
                            >
                              {ROL_LABELS[r] ?? r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {tiempoRelativo(u.ultimaActividad)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {u.ultimaConexion
                          ? formatDateTime(u.ultimaConexion)
                          : <span className="text-gray-300 italic">Nunca</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
