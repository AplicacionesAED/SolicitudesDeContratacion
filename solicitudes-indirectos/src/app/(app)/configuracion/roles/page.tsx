"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Trash2, Shield, ShieldCheck, X, Settings, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FUNCIONALIDADES_DISPONIBLES } from "@/lib/utils";
import { Spinner } from "@/shared/ui/spinner";

interface Rol {
  slug: string;
  nombre: string;
  descripcion: string | null;
  funcionalidades: string[];
  verTodasSolicitudes: boolean;
  protegido: boolean;
}

interface FormData {
  nombre: string;
  descripcion: string;
  funcionalidades: string[];
  verTodasSolicitudes: boolean;
}

const EMPTY_FORM: FormData = {
  nombre: "",
  descripcion: "",
  funcionalidades: [],
  verTodasSolicitudes: false,
};

export default function RolesPage() {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRol, setEditingRol] = useState<Rol | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/config/roles");
    if (res.ok) setRoles(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const openCreate = () => {
    setEditingRol(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (rol: Rol) => {
    setEditingRol(rol);
    setForm({
      nombre: rol.nombre,
      descripcion: rol.descripcion ?? "",
      funcionalidades: rol.funcionalidades,
      verTodasSolicitudes: rol.verTodasSolicitudes,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const url = editingRol
        ? `/api/config/roles/${editingRol.slug}`
        : "/api/config/roles";
      const method = editingRol ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setFormError(data.error ?? "Error desconocido");
        return;
      }
      setModalOpen(false);
      await fetchRoles();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rol: Rol) => {
    if (!confirm(`¿Eliminar el rol "${rol.nombre}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/config/roles/${rol.slug}`, { method: "DELETE" });
    if (res.ok) await fetchRoles();
  };

  const toggleFuncionalidad = (slug: string) => {
    setForm((f) => ({
      ...f,
      funcionalidades: f.funcionalidades.includes(slug)
        ? f.funcionalidades.filter((s) => s !== slug)
        : [...f.funcionalidades, slug],
    }));
  };

  if (session?.user?.rol !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-sm">
          <Settings size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No tienes permiso para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/configuracion"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver a Configuración
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gestiona los roles del sistema y sus permisos
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Nuevo Rol
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Funcionalidades</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                  Ve todas
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.map((rol) => (
                <tr key={rol.slug} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{rol.nombre}</span>
                      {rol.protegido && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          Sistema
                        </span>
                      )}
                    </div>
                    {rol.descripcion && (
                      <p className="text-xs text-gray-400 mt-0.5">{rol.descripcion}</p>
                    )}
                    <p className="text-xs text-gray-300 font-mono mt-0.5">{rol.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {rol.funcionalidades.length === 0 ? (
                        <span className="text-xs text-gray-400">Sin funcionalidades</span>
                      ) : (
                        rol.funcionalidades.map((f) => (
                          <span
                            key={f}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                          >
                            {FUNCIONALIDADES_DISPONIBLES[f]?.nombre ?? f}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {rol.verTodasSolicitudes ? (
                      <ShieldCheck size={16} className="text-green-500" />
                    ) : (
                      <Shield size={16} className="text-gray-300" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(rol)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      {!rol.protegido && (
                        <button
                          onClick={() => handleDelete(rol)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear / editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingRol ? `Editar: ${editingRol.nombre}` : "Nuevo Rol"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {!editingRol && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="ej. Coordinador de Obra"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Descripción del rol"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Funcionalidades</p>
                <div className="space-y-1">
                  {Object.entries(FUNCIONALIDADES_DISPONIBLES).map(([slug, info]) => (
                    <label
                      key={slug}
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-blue-600"
                        checked={form.funcionalidades.includes(slug)}
                        onChange={() => toggleFuncionalidad(slug)}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{info.nombre}</p>
                        <p className="text-xs text-gray-400">{info.descripcion}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-blue-600"
                    checked={form.verTodasSolicitudes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, verTodasSolicitudes: e.target.checked }))
                    }
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Ver todas las solicitudes
                    </p>
                    <p className="text-xs text-gray-400">
                      Permite ver solicitudes de todos los frentes, no solo los asignados al usuario
                    </p>
                  </div>
                </label>
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Guardando..." : editingRol ? "Guardar cambios" : "Crear rol"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
