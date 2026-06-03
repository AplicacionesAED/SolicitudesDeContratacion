"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Trash2, BookOpen, X, CheckCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { tienePermiso } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Especialidad {
  id: number;
  nombre: string;
  descripcion: string | null;
}

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

let toastId = 0;

// ─── Component ────────────────────────────────────────────────────────────────

export default function EspecialidadesPage() {
  const { data: session } = useSession();
  const roles = session?.user?.roles ?? [];
  const funcionalidadesAdicionales = session?.user?.funcionalidadesAdicionales ?? [];
  const canManage = tienePermiso(roles, funcionalidadesAdicionales, "gestionar_especialidades");

  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modal crear
  const [createModal, setCreateModal] = useState(false);
  const [createNombre, setCreateNombre] = useState("");
  const [createDescripcion, setCreateDescripcion] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal editar
  const [editModal, setEditModal] = useState(false);
  const [editItem, setEditItem] = useState<Especialidad | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal eliminar
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Especialidad | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const addToast = (type: Toast["type"], message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchEspecialidades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/especialidades", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setEspecialidades(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEspecialidades(); }, [fetchEspecialidades]);

  // ── Crear ─────────────────────────────────────────────────────────────────────

  function openCreate() {
    setCreateNombre("");
    setCreateDescripcion("");
    setCreateError(null);
    setCreateModal(true);
  }

  async function handleCreate() {
    setCreateError(null);
    if (!createNombre.trim()) {
      setCreateError("El nombre es requerido");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch("/api/especialidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: createNombre.trim(), descripcion: createDescripcion.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Error al crear");
        return;
      }
      setCreateModal(false);
      addToast("success", "Especialidad creada correctamente");
      await fetchEspecialidades();
    } catch {
      setCreateError("No se pudo conectar con el servidor");
    } finally {
      setCreateLoading(false);
    }
  }

  // ── Editar ────────────────────────────────────────────────────────────────────

  function openEdit(item: Especialidad) {
    setEditItem(item);
    setEditNombre(item.nombre);
    setEditDescripcion(item.descripcion ?? "");
    setEditError(null);
    setEditModal(true);
  }

  async function handleEdit() {
    if (!editItem) return;
    setEditError(null);
    if (!editNombre.trim()) {
      setEditError("El nombre es requerido");
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetch(`/api/especialidades/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: editNombre.trim(), descripcion: editDescripcion.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "Error al actualizar");
        return;
      }
      setEditModal(false);
      addToast("success", "Especialidad actualizada correctamente");
      await fetchEspecialidades();
    } catch {
      setEditError("No se pudo conectar con el servidor");
    } finally {
      setEditLoading(false);
    }
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────────

  function openDelete(item: Especialidad) {
    setDeleteItem(item);
    setDeleteModal(true);
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/especialidades/${deleteItem.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        addToast("error", data.error ?? "Error al eliminar");
        return;
      }
      setDeleteModal(false);
      addToast("success", "Especialidad eliminada correctamente");
      await fetchEspecialidades();
    } catch {
      addToast("error", "No se pudo conectar con el servidor");
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-lg px-4 py-3 text-sm shadow-lg text-white
              ${t.type === "success" ? "bg-green-600" : "bg-red-600"}`}
          >
            {t.type === "success"
              ? <CheckCircle size={15} className="mt-0.5 shrink-0" />
              : <X size={15} className="mt-0.5 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Especialidades</h1>
          <p className="text-sm text-gray-500 mt-0.5">Catálogo de especialidades de terceros</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus size={16} />
            Nueva Especialidad
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="md" />
            <span className="ml-3 text-sm text-gray-500">Cargando especialidades...</span>
          </div>
        ) : especialidades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-3">
              <BookOpen size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">Sin especialidades registradas</p>
            <p className="text-xs text-gray-500 mt-1">Crea la primera especialidad usando el botón de arriba.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                {["Nombre", "Descripción", "Acciones"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {especialidades.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{e.nombre}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">{e.descripcion ?? <span className="italic text-gray-400">—</span>}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {canManage && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(e)}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
                        >
                          <Pencil size={12} /> Editar
                        </button>
                        <button
                          onClick={() => openDelete(e)}
                          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          <Trash2 size={12} /> Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Nueva Especialidad</h2>
              <button onClick={() => setCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createNombre}
                  onChange={(e) => setCreateNombre(e.target.value)}
                  placeholder="Ej: Ingeniería Civil"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={createDescripcion}
                  onChange={(e) => setCreateDescripcion(e.target.value)}
                  placeholder="Descripción opcional..."
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {createError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{createError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => setCreateModal(false)} disabled={createLoading}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createLoading}>
                {createLoading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {editModal && editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Editar Especialidad</h2>
              <button onClick={() => setEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={editDescripcion}
                  onChange={(e) => setEditDescripcion(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {editError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{editError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => setEditModal(false)} disabled={editLoading}>
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={editLoading}>
                {editLoading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {deleteModal && deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Eliminar Especialidad</h2>
              <button onClick={() => setDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              ¿Eliminar <span className="font-semibold text-gray-900">&quot;{deleteItem.nombre}&quot;</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteModal(false)} disabled={deleteLoading}>
                Cancelar
              </Button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
