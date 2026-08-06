"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, ChevronLeft, ChevronRight, FileText,
  SlidersHorizontal, X, ChevronDown, ChevronUp, ChevronRight as ChevronRightIcon,
  GitMerge,
} from "lucide-react";
import { SolicitudBadge } from "@/features/solicitudes/components/solicitudBadge";
import { HistoricoBadge } from "@/features/solicitudes/components/historicoBadge";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import {
  ESTADO_LABELS,
  TIPO_SOLICITUD_LABELS,
  formatCurrency,
  formatDate,
} from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SolicitudRow {
  id: number;
  consecutivo: string;
  tipo: string;
  frentesIds: number[];
  proyectoId: number;
  tercero?: { razonSocial: string; nit: string } | null;
  solicitante: { nombre: string };
  valorFinal?: number | string | null;
  estado: string;
  fechaSolicitud: string;
  _count?: { otrosis: number };
  importadoHistorico?: boolean;
  numeroOtrosi?: number | null;
}

interface Proyecto {
  id: number;
  nombre: string;
}

interface Frente {
  id: number;
  nombre: string;
  proyecto: { id: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADO_OPTIONS = Object.entries(ESTADO_LABELS).map(([value, label]) => ({ value, label }));
const TIPO_OPTIONS = Object.entries(TIPO_SOLICITUD_LABELS).map(([value, label]) => ({ value, label }));
const PAGE_SIZE = 15;

// ─── Component ────────────────────────────────────────────────────────────────

export default function SolicitudesPage() {
  const router = useRouter();

  const [solicitudes, setSolicitudes] = useState<SolicitudRow[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [frentes, setFreentes] = useState<Frente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filtros básicos
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterTipo, setFilterTipo] = useState("");

  // Filtros avanzados
  const [filterProyecto, setFilterProyecto] = useState("");
  const [filterFrente, setFilterFrente] = useState("");
  const [filterFechaDesde, setFilterFechaDesde] = useState("");
  const [filterFechaHasta, setFilterFechaHasta] = useState("");
  const [filterValorMin, setFilterValorMin] = useState("");
  const [filterValorMax, setFilterValorMax] = useState("");

  const [page, setPage] = useState(0);

  // Expandable otrosís
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [childrenMap, setChildrenMap] = useState<Record<number, SolicitudRow[] | "loading">>({});

  // ── Fetch catálogos ─────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([fetch("/api/proyectos"), fetch("/api/frentes")]).then(
      async ([pRes, fRes]) => {
        if (pRes.ok) setProyectos(await pRes.json());
        if (fRes.ok) setFreentes(await fRes.json());
      }
    );
  }, []);

  // ── Fetch solicitudes ───────────────────────────────────────────────────────

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEstado) params.set("estado", filterEstado);
      if (filterTipo) params.set("tipo", filterTipo);
      if (filterProyecto) params.set("proyectoId", filterProyecto);
      if (filterFrente) params.set("frenteId", filterFrente);
      if (filterFechaDesde) params.set("fechaDesde", filterFechaDesde);
      if (filterFechaHasta) {
        const hasta = new Date(filterFechaHasta);
        hasta.setHours(23, 59, 59, 999);
        params.set("fechaHasta", hasta.toISOString());
      }

      const res = await fetch(`/api/solicitudes?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSolicitudes(Array.isArray(data) ? data : []);
      }
    } catch {
      // keep existing list
    } finally {
      setLoading(false);
    }
  }, [filterEstado, filterTipo, filterProyecto, filterFrente, filterFechaDesde, filterFechaHasta]);

  useEffect(() => { fetchSolicitudes(); }, [fetchSolicitudes]);
  useEffect(() => { setPage(0); }, [filterEstado, filterTipo, filterProyecto, filterFrente, filterFechaDesde, filterFechaHasta, filterValorMin, filterValorMax, search]);

  // ── Frentes filtrados por proyecto seleccionado ─────────────────────────────

  const frentesFiltrados = filterProyecto
    ? frentes.filter((f) => String(f.proyecto.id) === filterProyecto)
    : frentes;

  // ── Filtrado cliente ────────────────────────────────────────────────────────

  const filtered = solicitudes.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        s.consecutivo.toLowerCase().includes(q) ||
        (s.tercero?.razonSocial ?? "").toLowerCase().includes(q) ||
        (s.tercero?.nit ?? "").toLowerCase().includes(q) ||
        s.solicitante.nombre.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterValorMin && s.valorFinal != null) {
      if (Number(s.valorFinal) < Number(filterValorMin)) return false;
    }
    if (filterValorMax && s.valorFinal != null) {
      if (Number(s.valorFinal) > Number(filterValorMax)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── Conteo de filtros avanzados activos ─────────────────────────────────────

  const advancedActiveCount = [filterProyecto, filterFrente, filterFechaDesde, filterFechaHasta, filterValorMin, filterValorMax].filter(Boolean).length;

  function clearAll() {
    setSearch("");
    setFilterEstado("");
    setFilterTipo("");
    setFilterProyecto("");
    setFilterFrente("");
    setFilterFechaDesde("");
    setFilterFechaHasta("");
    setFilterValorMin("");
    setFilterValorMax("");
  }

  const hasAnyFilter = search || filterEstado || filterTipo || advancedActiveCount > 0;

  // ── Expand/collapse otrosís ─────────────────────────────────────────────────

  async function toggleExpand(e: React.MouseEvent, id: number) {
    e.stopPropagation();

    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    if (!expandedIds.has(id) && childrenMap[id] === undefined) {
      setChildrenMap((prev) => ({ ...prev, [id]: "loading" }));
      try {
        const res = await fetch(`/api/solicitudes?solicitudPadreId=${id}`);
        const data = await res.json();
        setChildrenMap((prev) => ({ ...prev, [id]: Array.isArray(data) ? data : [] }));
      } catch {
        setChildrenMap((prev) => ({ ...prev, [id]: [] }));
      }
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Solicitudes</h1>
        <Link href="/solicitudes/nueva">
          <Button>
            <Plus size={16} />
            Nueva Solicitud
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Fila principal */}
        <div className="flex flex-wrap gap-3 p-4 border-b border-gray-100">
          {/* Búsqueda */}
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por consecutivo, tercero o solicitante..."
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Estado */}
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos los estados</option>
            {ESTADO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Tipo */}
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos los tipos</option>
            {TIPO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Toggle filtros avanzados */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              advancedActiveCount > 0
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <SlidersHorizontal size={14} />
            Filtros
            {advancedActiveCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {advancedActiveCount}
              </span>
            )}
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {/* Limpiar todo */}
          {hasAnyFilter && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <X size={13} />
              Limpiar
            </button>
          )}
        </div>

        {/* Panel de filtros avanzados */}
        {showAdvanced && (
          <div className="px-4 py-4 bg-gray-50/50 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Proyecto */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Proyecto</label>
              <select
                value={filterProyecto}
                onChange={(e) => { setFilterProyecto(e.target.value); setFilterFrente(""); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Todos los proyectos</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            {/* Frente */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Frente</label>
              <select
                value={filterFrente}
                onChange={(e) => setFilterFrente(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
                disabled={frentesFiltrados.length === 0}
              >
                <option value="">Todos los frentes</option>
                {frentesFiltrados.map((f) => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </select>
            </div>

            {/* Fecha desde */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha desde</label>
              <input
                type="date"
                value={filterFechaDesde}
                onChange={(e) => setFilterFechaDesde(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Fecha hasta */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha hasta</label>
              <input
                type="date"
                value={filterFechaHasta}
                min={filterFechaDesde}
                onChange={(e) => setFilterFechaHasta(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Valor mínimo */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valor mínimo</label>
              <input
                type="number"
                value={filterValorMin}
                onChange={(e) => setFilterValorMin(e.target.value)}
                placeholder="0"
                min={0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Valor máximo */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valor máximo</label>
              <input
                type="number"
                value={filterValorMax}
                onChange={(e) => setFilterValorMax(e.target.value)}
                placeholder="Sin límite"
                min={0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Contador de resultados */}
        {!loading && (
          <div className="px-4 py-2 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {filtered.length} solicitud{filtered.length !== 1 ? "es" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="md" />
            <span className="ml-3 text-sm text-gray-500">Cargando solicitudes...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-3">
              <FileText size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No se encontraron solicitudes</p>
            <p className="text-xs text-gray-500 mt-1">
              {hasAnyFilter ? "Prueba ajustando los filtros." : "Crea tu primera solicitud."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="w-8 px-2 py-3" />
                  {["Consecutivo", "Tipo", "Tercero", "Solicitante", "Valor", "Estado", "Fecha", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((sol) => {
                  const hasOtrosis = (sol._count?.otrosis ?? 0) > 0;
                  const isExpanded = expandedIds.has(sol.id);
                  const children = childrenMap[sol.id];

                  return (
                    <Fragment key={sol.id}>
                      {/* Parent row */}
                      <tr
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/solicitudes/${sol.id}`)}
                      >
                        <td className="w-8 px-2 py-3 text-center" onClick={(e) => hasOtrosis && toggleExpand(e, sol.id)}>
                          {hasOtrosis && (
                            <button
                              className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-blue-100 text-blue-500 transition-colors"
                              title={isExpanded ? "Colapsar otrosís" : `Ver ${sol._count!.otrosis} otrosí(s)`}
                            >
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRightIcon size={13} />}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-mono font-semibold text-blue-600">
                            {sol.consecutivo}
                          </span>
                          {hasOtrosis && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 border border-blue-100">
                              <GitMerge size={9} />
                              {sol._count!.otrosis}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[180px]">
                          <span className="block truncate">
                            {TIPO_SOLICITUD_LABELS[sol.tipo] ?? sol.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[180px]">
                          <span className="block truncate">{sol.tercero?.razonSocial ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {sol.solicitante.nombre}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {sol.valorFinal ? formatCurrency(sol.valorFinal) : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <SolicitudBadge estado={sol.estado} />
                            {sol.importadoHistorico && <HistoricoBadge numeroOtrosi={sol.numeroOtrosi} />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(sol.fechaSolicitud)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <Link
                            href={`/solicitudes/${sol.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Ver
                          </Link>
                        </td>
                      </tr>

                      {/* Child otrosí rows */}
                      {isExpanded && (
                        <>
                          {children === "loading" ? (
                            <tr className="bg-blue-50/40">
                              <td colSpan={9} className="px-10 py-3">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Spinner size="sm" />
                                  Cargando otrosís...
                                </div>
                              </td>
                            </tr>
                          ) : Array.isArray(children) && children.length === 0 ? (
                            <tr className="bg-blue-50/40">
                              <td colSpan={9} className="px-10 py-3 text-xs text-gray-400 italic">
                                Sin otrosís registrados.
                              </td>
                            </tr>
                          ) : Array.isArray(children) && children.map((child) => (
                            <tr
                              key={child.id}
                              className="bg-blue-50/30 hover:bg-blue-50/60 cursor-pointer border-l-2 border-blue-300 transition-colors"
                              onClick={() => router.push(`/solicitudes/${child.id}`)}
                            >
                              <td className="w-8 px-2 py-2.5" />
                              <td className="px-4 py-2.5 whitespace-nowrap pl-8">
                                <span className="text-xs font-mono font-semibold text-blue-700">
                                  {child.consecutivo}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap max-w-[180px]">
                                <span className="block truncate">
                                  {TIPO_SOLICITUD_LABELS[child.tipo] ?? child.tipo}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap max-w-[180px]">
                                <span className="block truncate">{child.tercero?.razonSocial ?? "—"}</span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                                {child.solicitante.nombre}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                                {child.valorFinal ? formatCurrency(child.valorFinal) : "—"}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <SolicitudBadge estado={child.estado} />
                                  {child.importadoHistorico && (
                                    <HistoricoBadge numeroOtrosi={child.numeroOtrosi} />
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                                {formatDate(child.fechaSolicitud)}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-right">
                                <Link
                                  href={`/solicitudes/${child.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Ver
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                <ChevronLeft size={14} />
                Anterior
              </Button>
              <span className="text-xs text-gray-600 font-medium">{page + 1} / {totalPages}</span>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
                Siguiente
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
