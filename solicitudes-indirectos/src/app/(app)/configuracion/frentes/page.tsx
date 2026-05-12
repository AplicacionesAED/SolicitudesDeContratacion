"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { MapPin, Users, Settings, Plus, X, Pencil, Trash2, LayoutDashboard, Hash, Filter } from "lucide-react";
import { Spinner } from "@/shared/ui/spinner";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  nombre: string;
  roles: string[];
  cargo?: string | null;
}

interface FrenteUsuario {
  userId: string;
  frenteId: number;
  user?: User;
}

interface Frente {
  id: number;
  nombre: string;
  etapa?: number | null;
  proyecto: { id: number; nombre: string; activo: boolean };
  aprobadorConfig?: {
    aprobadorId: string;
    contratosTramiteId?: string | null;
    contratosMinutaId?: string | null;
    controlesId?: string | null;
    directorControlesId?: string | null;
  } | null;
  usuarios?: FrenteUsuario[];
}

interface Proyecto {
  id: number;
  nombre: string;
  codigoConsecutivo?: string | null;
  activo: boolean;
  _count?: { frentes: number };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FrentesPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.rol;

  const [frentes, setFreentes] = useState<Frente[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals — crear proyecto
  const [proyectoModal, setProyectoModal] = useState(false);
  const [proyectoNombre, setProyectoNombre] = useState("");

  // Modals — crear frente
  const [frenteModal, setFrenteModal] = useState(false);
  const [frenteNombre, setFrenteNombre] = useState("");
  const [frenteProyectoId, setFrenteProyectoId] = useState<number | "">("");
  const [frenteEtapa, setFrenteEtapa] = useState<number | "">("");

  // Modal — editar proyecto
  const [editProyectoModal, setEditProyectoModal] = useState(false);
  const [editProyecto, setEditProyecto] = useState<Proyecto | null>(null);
  const [editProyectoNombre, setEditProyectoNombre] = useState("");
  const [editProyectoCodigo, setEditProyectoCodigo] = useState("");

  // Modal — editar frente
  const [editModal, setEditModal] = useState(false);
  const [editFrente, setEditFrente] = useState<Frente | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editProyectoId, setEditProyectoId] = useState<number | "">("");
  const [editEtapa, setEditEtapa] = useState<number | "">("");

  // Modal — confirmar eliminación
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteFrente, setDeleteFrente] = useState<Frente | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtro por etapa
  const [filtroEtapa, setFiltroEtapa] = useState<number | "">("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fRes, pRes, uRes] = await Promise.all([
        fetch("/api/frentes"),
        fetch("/api/proyectos"),
        fetch("/api/users"),
      ]);
      if (!fRes.ok) throw new Error("Error al cargar frentes");
      if (!pRes.ok) throw new Error("Error al cargar proyectos");
      if (!uRes.ok) throw new Error("Error al cargar usuarios");
      const [fData, pData, uData] = await Promise.all([fRes.json(), pRes.json(), uRes.json()]);
      setFreentes(Array.isArray(fData) ? fData : []);
      setProyectos(Array.isArray(pData) ? pData : []);
      setUsuarios(Array.isArray(uData) ? uData : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Editar proyecto ─────────────────────────────────────────────────────────
  function openEditProyectoModal(p: Proyecto) {
    setEditProyecto(p);
    setEditProyectoNombre(p.nombre);
    setEditProyectoCodigo(p.codigoConsecutivo ?? "");
    setFormError(null);
    setEditProyectoModal(true);
  }

  async function editarProyecto(e: React.FormEvent) {
    e.preventDefault();
    if (!editProyecto) return;
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/proyectos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editProyecto.id,
          nombre: editProyectoNombre,
          codigoConsecutivo: editProyectoCodigo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al editar proyecto");
      setEditProyectoModal(false);
      setEditProyecto(null);
      fetchData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  // ── Crear proyecto ──────────────────────────────────────────────────────────
  async function crearProyecto(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: proyectoNombre }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear proyecto");
      setProyectoModal(false);
      setProyectoNombre("");
      fetchData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  // ── Crear frente ────────────────────────────────────────────────────────────
  async function crearFrente(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/frentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: frenteNombre,
          proyectoId: frenteProyectoId,
          etapa: frenteEtapa || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear frente");
      setFrenteModal(false);
      setFrenteNombre("");
      setFrenteProyectoId("");
      setFrenteEtapa("");
      fetchData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  // ── Editar frente ───────────────────────────────────────────────────────────
  function openEditModal(frente: Frente) {
    setEditFrente(frente);
    setEditNombre(frente.nombre);
    setEditProyectoId(frente.proyecto.id);
    setEditEtapa(frente.etapa ?? "");
    setFormError(null);
    setEditModal(true);
  }

  async function editarFrente(e: React.FormEvent) {
    e.preventDefault();
    if (!editFrente) return;
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/frentes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editFrente.id,
          nombre: editNombre,
          proyectoId: editProyectoId,
          etapa: editEtapa || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al editar frente");
      setEditModal(false);
      setEditFrente(null);
      fetchData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  // ── Eliminar frente ─────────────────────────────────────────────────────────
  function openDeleteModal(frente: Frente) {
    setDeleteFrente(frente);
    setDeleteModal(true);
  }

  async function eliminarFrente() {
    if (!deleteFrente) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/frentes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteFrente.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al eliminar frente");
      setDeleteModal(false);
      setDeleteFrente(null);
      fetchData();
    } catch (e) {
      // show error inside delete modal via alert (simple approach)
      alert(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setDeleting(false);
    }
  }

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (userRole && userRole !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-sm">
          <Settings size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No tienes permiso para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  // ── Group frentes by project (with etapa filter) ────────────────────────────
  const frentesFiltrados = filtroEtapa !== ""
    ? frentes.filter((f) => f.etapa === filtroEtapa)
    : frentes;

  const byProject: Record<string, { proyectoId: number; proyectoNombre: string; activo: boolean; frentes: Frente[] }> = {};
  for (const f of frentesFiltrados) {
    const key = String(f.proyecto.id);
    if (!byProject[key]) {
      byProject[key] = { proyectoId: f.proyecto.id, proyectoNombre: f.proyecto.nombre, activo: f.proyecto.activo, frentes: [] };
    }
    byProject[key].frentes.push(f);
  }
  // Solo mostrar proyectos sin frentes cuando no hay filtro activo
  if (filtroEtapa === "") {
    for (const p of proyectos) {
      if (!byProject[String(p.id)]) {
        byProject[String(p.id)] = { proyectoId: p.id, proyectoNombre: p.nombre, activo: p.activo, frentes: [] };
      }
    }
  }
  const projects = Object.values(byProject)
    .sort((a, b) => a.proyectoNombre.localeCompare(b.proyectoNombre))
    .map((p) => ({
      ...p,
      frentes: [...p.frentes].sort((a, b) => (a.etapa ?? 999) - (b.etapa ?? 999)),
    }));

  // Etapas disponibles en los frentes cargados
  const etapasDisponibles = [...new Set(frentes.map((f) => f.etapa).filter(Boolean))].sort() as number[];

  // ── Approvers list ──────────────────────────────────────────────────────────
  const possibleApprovers = usuarios.filter(u => 
    u.roles.includes("ADMIN") || 
    u.roles.includes("DIRECTOR_PROYECTO") ||
    u.roles.includes("DIRECTOR_CONTROLES")
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos y Frentes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona proyectos, frentes y usuarios asignados.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por etapa */}
          <div className="relative flex items-center gap-1.5">
            <Filter size={13} className="absolute left-2.5 text-gray-400 pointer-events-none" />
            <select
              value={filtroEtapa}
              onChange={(e) => setFiltroEtapa(e.target.value ? Number(e.target.value) : "")}
              className="rounded-lg border border-gray-300 bg-white pl-8 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Todas las etapas</option>
              {etapasDisponibles.map((n) => (
                <option key={n} value={n}>Etapa {n}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { setProyectoNombre(""); setFormError(null); setProyectoModal(true); }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus size={15} />
            Nuevo Proyecto
          </button>
          <button
            onClick={() => {
              setFrenteNombre("");
              setFrenteProyectoId("");
              setFrenteEtapa("");
              setFormError(null);
              setFrenteModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            Nuevo Frente
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : error ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button onClick={fetchData} className="text-sm text-blue-600 hover:underline">Reintentar</button>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <MapPin size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400 italic">No hay proyectos configurados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div key={project.proyectoId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Project header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                    <MapPin size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-gray-900">{project.proyectoNombre}</h2>
                      {(() => {
                        const p = proyectos.find(p => p.id === project.proyectoId);
                        return p?.codigoConsecutivo ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5">
                            <Hash size={10} />{p.codigoConsecutivo}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <p className="text-xs text-gray-500">
                      {project.frentes.length} frente{project.frentes.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${project.activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {project.activo ? "Activo" : "Inactivo"}
                  </span>
                  <button
                    onClick={() => {
                      const p = proyectos.find(p => p.id === project.proyectoId);
                      if (p) openEditProyectoModal(p);
                    }}
                    title="Editar proyecto"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => { setFrenteNombre(""); setFrenteProyectoId(project.proyectoId); setFormError(null); setFrenteModal(true); }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <Plus size={12} />
                    Agregar frente
                  </button>
                </div>
              </div>

              {/* Frentes agrupados por etapa */}
              {project.frentes.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-xs text-gray-400 italic">Sin frentes. Usa el botón "Agregar frente" para crear el primero.</p>
                </div>
              ) : (() => {
                // Agrupar por etapa manteniendo el orden ya aplicado
                const grupos: { etapa: number | null; frentes: Frente[] }[] = [];
                for (const frente of project.frentes) {
                  const etapa = frente.etapa ?? null;
                  const grupo = grupos.find(g => g.etapa === etapa);
                  if (grupo) grupo.frentes.push(frente);
                  else grupos.push({ etapa, frentes: [frente] });
                }
                return (
                  <div>
                    {grupos.map((grupo) => (
                      <div key={grupo.etapa ?? "sin-etapa"}>
                        {/* Subtítulo de etapa */}
                        <div className="px-5 pt-5 pb-2 flex items-center gap-3">
                          <span className="text-sm font-bold text-blue-600">
                            {grupo.etapa !== null ? `Etapa ${grupo.etapa}` : "Sin etapa"}
                          </span>
                          <div className="flex-1 h-px bg-blue-100" />
                        </div>
                        {/* Frentes de este grupo */}
                        <div className="divide-y divide-gray-100">
                          {grupo.frentes.map((frente) => (
                            <div key={frente.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                              <div className="flex items-center justify-between gap-4">
                                <Link
                                  href={`/configuracion/frentes/${frente.id}`}
                                  className="flex-1 text-left group"
                                >
                                  <h3 className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                                    {frente.nombre}
                                  </h3>
                                </Link>
                                <div className="shrink-0 flex items-center gap-1">
                                  <Link
                                    href={`/configuracion/frentes/${frente.id}`}
                                    title="Ver detalles y configurar aprobadores"
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                                  >
                                    <LayoutDashboard size={16} />
                                  </Link>
                                  <button
                                    onClick={() => openEditModal(frente)}
                                    title="Editar frente"
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => openDeleteModal(frente)}
                                    title="Eliminar frente"
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Editar Proyecto ───────────────────────────────────────────── */}
      {editProyectoModal && editProyecto && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setEditProyectoModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Editar Proyecto</h2>
                <button onClick={() => setEditProyectoModal(false)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={16} /></button>
              </div>
              <form onSubmit={editarProyecto} className="px-6 py-4 space-y-4">
                {formError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del Proyecto <span className="text-red-500">*</span></label>
                  <input
                    required
                    value={editProyectoNombre}
                    onChange={(e) => setEditProyectoNombre(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Código en consecutivo</label>
                  <input
                    value={editProyectoCodigo}
                    onChange={(e) => setEditProyectoCodigo(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej. BAI"
                    maxLength={10}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Código corto que aparecerá en el consecutivo (ej. <span className="font-mono">SOL-CONT-<strong>BAI</strong>-KALA1-001</span>). Si se deja vacío se genera automáticamente.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setEditProyectoModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving && <Spinner size="sm" />}
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Nuevo Proyecto ─────────────────────────────────────────────── */}
      {proyectoModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setProyectoModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Nuevo Proyecto</h2>
                <button onClick={() => setProyectoModal(false)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={16} /></button>
              </div>
              <form onSubmit={crearProyecto} className="px-6 py-4 space-y-4">
                {formError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del Proyecto <span className="text-red-500">*</span></label>
                  <input
                    required
                    value={proyectoNombre}
                    onChange={(e) => setProyectoNombre(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej. Residencial Las Palmas"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setProyectoModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving && <Spinner size="sm" />}
                    Crear
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Nuevo Frente ───────────────────────────────────────────────── */}
      {frenteModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setFrenteModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Nuevo Frente</h2>
                <button onClick={() => setFrenteModal(false)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={16} /></button>
              </div>
              <form onSubmit={crearFrente} className="px-6 py-4 space-y-4">
                {formError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Proyecto <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={frenteProyectoId}
                    onChange={(e) => setFrenteProyectoId(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar proyecto...</option>
                    {proyectos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del Frente <span className="text-red-500">*</span></label>
                  <input
                    required
                    value={frenteNombre}
                    onChange={(e) => setFrenteNombre(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej. NORTE 1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Etapa</label>
                  <select
                    value={frenteEtapa}
                    onChange={(e) => setFrenteEtapa(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin etapa</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>Etapa {n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setFrenteModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving && <Spinner size="sm" />}
                    Crear
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Editar Frente ──────────────────────────────────────────────── */}
      {editModal && editFrente && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setEditModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Editar Frente</h2>
                <button onClick={() => setEditModal(false)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={16} /></button>
              </div>
              <form onSubmit={editarFrente} className="px-6 py-4 space-y-4">
                {formError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Proyecto <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={editProyectoId}
                    onChange={(e) => setEditProyectoId(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar proyecto...</option>
                    {proyectos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del Frente <span className="text-red-500">*</span></label>
                  <input
                    required
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej. NORTE 1"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Etapa</label>
                  <select
                    value={editEtapa}
                    onChange={(e) => setEditEtapa(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin etapa</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>Etapa {n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setEditModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving && <Spinner size="sm" />}
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Confirmar Eliminación ──────────────────────────────────────── */}
      {deleteModal && deleteFrente && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => !deleting && setDeleteModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Eliminar Frente</h2>
                <button
                  onClick={() => setDeleteModal(false)}
                  disabled={deleting}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-gray-600">
                  ¿Estás seguro de que deseas eliminar el frente{" "}
                  <span className="font-semibold text-gray-900">"{deleteFrente.nombre}"</span>?
                  Esta acción no se puede deshacer.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteModal(false)}
                    disabled={deleting}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={eliminarFrente}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting && <Spinner size="sm" />}
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}