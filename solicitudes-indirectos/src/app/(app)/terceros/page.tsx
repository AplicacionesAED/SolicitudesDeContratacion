"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Search, Users, CheckCircle, Clock,
  Eye, Pencil, RefreshCw, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "next-auth/react";
import { tienePermiso, formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tercero {
  id: number;
  razonSocial: string;
  nit: string;
  tipoContrato: string;
  confidencialidad: boolean;
  fechaVencimientoSagrilaft: string | null;
  dd_identificacionContraparte: boolean;
  dd_consultaListasRestrictivas: boolean;
  dd_verificacionPep: boolean;
  dd_conocimientoNegocio: boolean;
  dd_monitoreoActualizacion: boolean;
  dd_senalesAlertaReporte: boolean;
  aprobadoDebidaDiligencia: boolean;
}


// ─── Toast simple ─────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

let toastId = 0;

// ─── Component ────────────────────────────────────────────────────────────────

export default function TercerosPage() {
  const { data: session } = useSession();
  const roles = session?.user?.roles ?? [];
  const funcionalidadesAdicionales = session?.user?.funcionalidadesAdicionales ?? [];

  const canCreate = tienePermiso(roles, funcionalidadesAdicionales, "crear_terceros");
  const canEdit = canCreate || roles.includes("CONTRATOS"); // Se mantiene acceso a Contratos o quien pueda crear

  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const addToast = (type: Toast["type"], message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchTerceros = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/terceros", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTerceros(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTerceros(); }, [fetchTerceros]);

  // ── Sync SharePoint ───────────────────────────────────────────────────────────

  const handleSync: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();

    setSyncing(true);
    try {
      const res = await fetch("/api/terceros/sync-sharepoint", { method: "POST" });
      const data = await res.json();

      if (data.ok) {
        addToast("success", data.message);
        await fetchTerceros();
      } else {
        addToast("error", data.message ?? "Error al sincronizar");
      }
    } catch {
      addToast("error", "No se pudo conectar con el servidor");
    } finally {
      setSyncing(false);
    }
  };

  // ── Filter + Pagination ───────────────────────────────────────────────────────

  const filtered = terceros.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.razonSocial.toLowerCase().includes(q) ||
      t.nit.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function goTo(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-lg px-4 py-3 text-sm shadow-lg text-white
              ${t.type === "success" ? "bg-green-600" : "bg-red-600"}`}
          >
            {t.type === "success" ? <CheckCircle size={15} className="mt-0.5 shrink-0" /> : <X size={15} className="mt-0.5 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Terceros / Debida Diligencia
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de proveedores y contratistas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : "Sincronizar SharePoint"}
          </Button>
          {canCreate && (
            <Link href="/terceros/nuevo">
              <Button>
                <Plus size={16} />
                Nuevo Tercero
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por razón social o NIT..."
            className="block w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm
              text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2
              focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="md" />
            <span className="ml-3 text-sm text-gray-500">Cargando terceros...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-3">
              <Users size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              {search ? "No se encontraron terceros" : "Sin terceros registrados"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {search
                ? "Prueba con otro término de búsqueda."
                : "Registra el primer tercero o sincroniza desde SharePoint."}
            </p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  {[
                    "Razón Social",
                    "Debida Diligencia",
                    "Vcto. SAGRILAFT",
                    "Confidencialidad",
                    "Acciones",
                  ].map((h) => (
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
                {paginated.map((t) => {
                  const diasRestantes = t.fechaVencimientoSagrilaft
                    ? Math.ceil((new Date(t.fechaVencimientoSagrilaft).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  const rowColor =
                    diasRestantes !== null && diasRestantes <= 20
                      ? "bg-red-50 hover:bg-red-100"
                      : diasRestantes !== null && diasRestantes <= 30
                      ? "bg-yellow-50 hover:bg-yellow-100"
                      : "hover:bg-gray-50";

                  return (
                    <tr key={t.id} className={`${rowColor} transition-colors`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{t.razonSocial}</p>
                      </td>

                      {/* Debida Diligencia badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.aprobadoDebidaDiligencia ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 rounded-full px-2.5 py-0.5">
                            <CheckCircle size={11} /> Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full px-2.5 py-0.5">
                            <X size={11} /> No
                          </span>
                        )}
                      </td>

                      {/* Fecha vencimiento SAGRILAFT */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.fechaVencimientoSagrilaft ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm text-gray-700">
                              {formatDate(t.fechaVencimientoSagrilaft)}
                            </span>
                            {diasRestantes !== null && (
                              <span className={`text-xs font-medium ${
                                diasRestantes <= 20
                                  ? "text-red-600"
                                  : diasRestantes <= 30
                                  ? "text-yellow-600"
                                  : "text-gray-400"
                              }`}>
                                {diasRestantes <= 0
                                  ? "Vencido"
                                  : `${diasRestantes} días restantes`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">—</span>
                        )}
                      </td>

                      {/* Confidencialidad badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.confidencialidad ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full px-2.5 py-0.5">
                            <CheckCircle size={11} /> Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full px-2.5 py-0.5">
                            <X size={11} /> No
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/terceros/${t.id}`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <Eye size={13} /> Ver Detalle
                          </Link>
                          {canEdit && (
                            <Link
                              href={`/terceros/${t.id}`}
                              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
                            >
                              <Pencil size={12} /> Editar
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goTo(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => goTo(p as number)}
                        className={`inline-flex items-center justify-center h-7 min-w-[28px] rounded-md text-xs font-medium transition-colors ${
                          p === currentPage
                            ? "bg-blue-600 text-white"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() => goTo(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}