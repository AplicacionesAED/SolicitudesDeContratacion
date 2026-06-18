"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Plus, Pencil, UserCheck, UserX, X, Settings, Search, Filter, KeyRound, AlertTriangle, FileDown, ArrowLeft, User, Mail, Phone, Briefcase, Lock, ShieldCheck, ListChecks, MapPin, Check } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { generatePassword } from "@/lib/password";
import { Spinner } from "@/shared/ui/spinner";
import { ROL_LABELS, FUNCIONALIDADES_POR_ROL } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Frente {
  id: number;
  nombre: string;
  etapa?: number | null;
  proyecto: { id: number; nombre: string };
}

// Agrupa frentes por proyecto y, dentro de cada proyecto, por etapa.
function agruparFrentesPorProyectoYEtapa(frentes: Frente[]) {
  const byProj: Record<string, { proyectoId: number; nombre: string; items: Frente[] }> = {};
  for (const f of frentes) {
    const k = String(f.proyecto.id);
    if (!byProj[k]) byProj[k] = { proyectoId: f.proyecto.id, nombre: f.proyecto.nombre, items: [] };
    byProj[k].items.push(f);
  }
  return Object.values(byProj)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map((group) => {
      const ordenados = [...group.items].sort((a, b) => (a.etapa ?? 999) - (b.etapa ?? 999));
      const etapas: { etapa: number | null; items: Frente[] }[] = [];
      for (const f of ordenados) {
        const etapa = f.etapa ?? null;
        const grupo = etapas.find((g) => g.etapa === etapa);
        if (grupo) grupo.items.push(f);
        else etapas.push({ etapa, items: [f] });
      }
      return { ...group, etapas };
    });
}

// Encabezado de sección dentro del modal de usuario.
function SectionLabel({ icon, title, hint, required }: { icon: ReactNode; title: string; hint?: ReactNode; required?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600 shrink-0">{icon}</span>
      <h3 className="text-sm font-semibold text-gray-800">
        {title}
        {required && <span className="text-red-500"> *</span>}
      </h3>
      {hint != null && <span className="ml-auto text-xs font-medium text-gray-400">{hint}</span>}
    </div>
  );
}

interface User {
  id: string;
  nombre: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  roles: string[];
  activo: boolean;
  funcionalidadesAdicionales?: string[];
  frentesAsignados?: {
    frenteId: number;
    frente: { id: number; nombre: string; proyecto: { nombre: string } };
  }[];
}

interface FormData {
  nombre: string;
  cargo: string;
  email: string;
  telefono: string;
  roles: string[];
  password: string;
  frentesIds: number[];
  funcionalidadesAdicionales: string[];
}

const EMPTY_FORM: FormData = {
  nombre: "",
  cargo: "",
  email: "",
  telefono: "",
  roles: ["SOLICITANTE"],
  password: "",
  frentesIds: [],
  funcionalidadesAdicionales: [],
};

// Todas las funcionalidades disponibles: slug => { nombre, rolPorDefecto }
const TODAS_LAS_FUNCIONALIDADES: Record<string, { nombre: string; rolPorDefecto: string | null }> = {
  crear_enviar_solicitudes: { nombre: "Crear y enviar solicitudes", rolPorDefecto: "SOLICITANTE" },
  crear_otrosi: { nombre: "Crear otrosís de contratos completados", rolPorDefecto: "SOLICITANTE" },
  crear_solicitudes_diseno: { nombre: "Crear solicitudes de diseño", rolPorDefecto: "TECNICA" },
  aprobar_director_tecnico: { nombre: "Aprobar solicitudes de Coordinador Técnico", rolPorDefecto: "DIRECTOR_TECNICO" },
  aprobar_solicitudes_frente: { nombre: "Aprobar solicitudes del frente", rolPorDefecto: "DIRECTOR_PROYECTO" },
  revisar_contratos: { nombre: "Gestionar contratos (tramitar, minutas, controles)", rolPorDefecto: "CONTRATOS" },
  registrar_adpro: { nombre: "Registrar en ADPRO", rolPorDefecto: "CONTROLES" },
  aprobacion_final: { nombre: "Aprobación final de solicitudes", rolPorDefecto: "DIRECTOR_CONTROLES" },
  crear_terceros: { nombre: "Crear y gestionar terceros", rolPorDefecto: "ADMIN" },
  gestionar_especialidades: { nombre: "Gestionar especialidades", rolPorDefecto: "ADMIN" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const ROL_OPTIONS = Object.entries(ROL_LABELS);

export default function UsuariosPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.rol;

  const [users, setUsers] = useState<User[]>([]);
  const [frentes, setFreentes] = useState<Frente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("");

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFrentesIds, setBulkFrentesIds] = useState<number[]>([]);
  const [generatedPasswords, setGeneratedPasswords] = useState<
    { nombre: string; email: string; password: string }[]
  >([]);
  const [generatingPasswords, setGeneratingPasswords] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, frentesRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/frentes"),
      ]);
      if (!usersRes.ok) throw new Error("Error al cargar usuarios");
      if (!frentesRes.ok) throw new Error("Error al cargar frentes");
      const [usersData, frentesData] = await Promise.all([
        usersRes.json(),
        frentesRes.json(),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setFreentes(Array.isArray(frentesData) ? frentesData : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (generatedPasswords.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [generatedPasswords.length]);

  const usuariosFiltrados = users.filter((u) => {
    const q = busqueda.toLowerCase();
    const coincideNombre = !busqueda || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const coincideRol = !filtroRol || u.roles.includes(filtroRol);
    return coincideNombre && coincideRol;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === usuariosFiltrados.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(usuariosFiltrados.map(u => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  async function handleBulkAssignFrentes() {
    if (selectedIds.length === 0 || bulkFrentesIds.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: selectedIds,
          frentesIds: bulkFrentesIds,
          action: "ASSIGN_FRENTES"
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error en asignación masiva");
      }
      setBulkModalOpen(false);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerarContrasenas() {
    const targets = users.filter((u) => selectedIds.includes(u.id));
    if (targets.length === 0) return;

    setGeneratingPasswords(true);
    try {
      const pairs = targets.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        password: generatePassword(),
      }));

      const res = await fetch("/api/users/reset-passwords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users: pairs.map(({ id, password }) => ({ id, password })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al resetear contraseñas");
      }

      setGeneratedPasswords(
        pairs.map(({ nombre, email, password }) => ({ nombre, email, password }))
      );
      setSelectedIds([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setGeneratingPasswords(false);
    }
  }

  function exportarContrasenas() {
    if (generatedPasswords.length === 0) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      generatedPasswords.map((p) => ({
        Nombre: p.nombre,
        Email: p.email,
        "Contraseña Temporal": p.password,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "Contraseñas");
    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `contraseñas-usuarios-${today}.xlsx`);
  }

  function openNew() {
    setEditingUser(null);
    setForm({
      nombre: "",
      cargo: "",
      email: "",
      telefono: "",
      roles: ["SOLICITANTE"],
      password: "",
      frentesIds: [],
      // Cargar funcionalidades por defecto del rol SOLICITANTE
      funcionalidadesAdicionales: FUNCIONALIDADES_POR_ROL["SOLICITANTE"] || [],
    });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    const userRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : ["SOLICITANTE"];

    // Cargar funcionalidades: combinar las del rol + las adicionales guardadas
    const funcionalidadesDelRol = userRoles.flatMap(
      (rol) => FUNCIONALIDADES_POR_ROL[rol] || []
    );
    const funcionalidadesAdicionales = Array.isArray(user.funcionalidadesAdicionales)
      ? user.funcionalidadesAdicionales
      : [];

    // Combinar: todas las del rol + las adicionales (evitando duplicados)
    const todasLasFuncionalidades = [
      ...new Set([...funcionalidadesDelRol, ...funcionalidadesAdicionales])
    ];

    setForm({
      nombre: user.nombre,
      cargo: user.cargo ?? "",
      email: user.email,
      telefono: user.telefono ?? "",
      roles: userRoles,
      password: "",
      frentesIds: user.frentesAsignados?.map((fa) => fa.frenteId) ?? [],
      funcionalidadesAdicionales: todasLasFuncionalidades,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function toggleFrente(id: number) {
    setForm((prev) => ({
      ...prev,
      frentesIds: prev.frentesIds.includes(id)
        ? prev.frentesIds.filter((f) => f !== id)
        : [...prev.frentesIds, id],
    }));
  }

  function toggleRol(rol: string) {
    setForm((prev) => {
      const has = prev.roles.includes(rol);
      let newRoles: string[];

      if (has && prev.roles.length === 1) {
        // Keep at least one role
        newRoles = prev.roles;
      } else {
        // Add or remove role
        newRoles = has
          ? prev.roles.filter((r) => r !== rol)
          : [...prev.roles, rol];
      }

      // Auto-update funcionalidades based on new roles
      const funcionalidadesDelNuevoRol = newRoles.flatMap(
        (r) => FUNCIONALIDADES_POR_ROL[r] || []
      );

      // Mantener las funcionalidades adicionales que no vienen del rol base
      const funcionalidadesActuales = prev.funcionalidadesAdicionales;
      const funcionalidadesAdicionales = funcionalidadesActuales.filter(
        (f) => !funcionalidadesDelNuevoRol.includes(f) || funcionalidadesActuales.includes(f)
      );

      // Combinar: del nuevo rol + las adicionales
      const nuevasFuncionalidades = [
        ...new Set([...funcionalidadesDelNuevoRol, ...funcionalidadesAdicionales])
      ];

      return {
        ...prev,
        roles: newRoles,
        funcionalidadesAdicionales: nuevasFuncionalidades,
      };
    });
  }

  function toggleFuncionalidad(slug: string) {
    setForm((prev) => ({
      ...prev,
      funcionalidadesAdicionales: prev.funcionalidadesAdicionales.includes(slug)
        ? prev.funcionalidadesAdicionales.filter((f) => f !== slug)
        : [...prev.funcionalidadesAdicionales, slug],
    }));
  }

  const needsFrente =
    form.roles.includes("SOLICITANTE") || form.roles.includes("TECNICA") || form.roles.includes("DIRECTOR_PROYECTO");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      let res: Response;
      if (editingUser) {
        const body: Record<string, unknown> = {
          nombre: form.nombre,
          cargo: form.cargo || null,
          telefono: form.telefono || null,
          roles: form.roles,
          frentesIds: form.frentesIds,
          funcionalidadesAdicionales: form.funcionalidadesAdicionales,
        };
        res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        const body: Record<string, unknown> = {
          nombre: form.nombre,
          cargo: form.cargo || null,
          email: form.email,
          telefono: form.telefono || null,
          roles: form.roles,
          password: form.password,
          frentesIds: form.frentesIds,
          funcionalidadesAdicionales: form.funcionalidadesAdicionales,
        };
        res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar usuario");
      }
      closeModal();
      fetchData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(user: User) {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !user.activo }),
      });
      if (!res.ok) throw new Error();
      fetchData();
    } catch {
      alert("Error al cambiar estado del usuario");
    }
  }

  if (userRole && userRole !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-sm">
          <Settings size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            No tienes permiso para acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
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
          <h1 className="text-2xl font-bold text-gray-900">Usuarios y Roles</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de usuarios del sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={() => { setBulkFrentesIds([]); setBulkModalOpen(true); }}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              Asignar Frentes ({selectedIds.length})
            </button>
          )}
          {selectedIds.length > 0 && (
            <button
              onClick={handleGenerarContrasenas}
              disabled={generatingPasswords}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-md shadow-emerald-100"
            >
              {generatingPasswords ? <Spinner size="sm" /> : <KeyRound size={16} />}
              Generar contraseñas ({selectedIds.length})
            </button>
          )}
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-100"
          >
            <Plus size={16} />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative flex items-center">
          <Filter size={13} className="absolute left-2.5 text-gray-400 pointer-events-none" />
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white pl-8 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="">Todos los perfiles</option>
            {ROL_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        {(busqueda || filtroRol) && (
          <button
            onClick={() => { setBusqueda(""); setFiltroRol(""); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <X size={13} />
            Limpiar
          </button>
        )}
        <p className="self-center text-xs text-gray-400 ml-auto">
          {usuariosFiltrados.length} de {users.length} usuario{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Generated passwords banner */}
      {generatedPasswords.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                {generatedPasswords.length} contraseña{generatedPasswords.length !== 1 ? "s" : ""} generada{generatedPasswords.length !== 1 ? "s" : ""} — expórtalas antes de salir, no se pueden recuperar después.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={exportarContrasenas}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                <FileDown size={13} />
                Exportar Excel
              </button>
              <button
                onClick={() => {
                  if (window.confirm("¿Seguro que deseas limpiar las contraseñas generadas? Esta acción no se puede deshacer.")) {
                    setGeneratedPasswords([]);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <X size={13} />
                Limpiar
              </button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-amber-200">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-amber-100/60 border-b border-amber-200">
                  <th className="px-3 py-2 text-left font-semibold text-amber-700 whitespace-nowrap">Nombre</th>
                  <th className="px-3 py-2 text-left font-semibold text-amber-700 whitespace-nowrap">Email</th>
                  <th className="px-3 py-2 text-left font-semibold text-amber-700 whitespace-nowrap">Contraseña Temporal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {generatedPasswords.map((p) => (
                  <tr key={p.email} className="hover:bg-amber-50/50">
                    <td className="px-3 py-2 text-gray-800 whitespace-nowrap">{p.nombre}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.email}</td>
                    <td className="px-3 py-2 font-mono font-medium text-gray-900 whitespace-nowrap">{p.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={fetchData}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <p className="text-sm text-gray-400 italic">No hay usuarios registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={usuariosFiltrados.length > 0 && selectedIds.length === usuariosFiltrados.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  {["Nombre", "Cargo", "Email", "Teléfono", "Perfiles", "Estado", "Acciones"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400 italic">
                      No se encontraron usuarios con los filtros aplicados.
                    </td>
                  </tr>
                ) : usuariosFiltrados.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(user.id) ? 'bg-blue-50/40' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {user.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {user.cargo ?? <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {user.telefono ?? <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(user.roles) ? user.roles : []).map((r) => (
                          <span
                            key={r}
                            className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 whitespace-nowrap"
                          >
                            {ROL_LABELS[r] ?? r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.activo
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                          }`}
                      >
                        {user.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <Pencil size={12} />
                          Editar
                        </button>
                        <button
                          onClick={() => toggleActivo(user)}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${user.activo
                              ? "text-red-600 bg-red-50 hover:bg-red-100"
                              : "text-green-600 bg-green-50 hover:bg-green-100"
                            }`}
                          title={user.activo ? "Desactivar" : "Activar"}
                        >
                          {user.activo ? <UserX size={12} /> : <UserCheck size={12} />}
                          {user.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-gray-900/5 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-[fade-up-in_0.2s_ease-out]">
              {/* Header */}
              <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white text-base font-bold shadow-sm shadow-blue-200 shrink-0">
                  {form.nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || <User size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-gray-900 leading-tight truncate">
                    {editingUser ? (form.nombre || "Editar usuario") : "Nuevo usuario"}
                  </h2>
                  <p className="text-xs text-gray-500 truncate">
                    {editingUser ? form.email : "Completa la información para crear la cuenta"}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="flex flex-col flex-1 overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                  {formError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                      {formError}
                    </div>
                  )}

                  {/* Datos personales */}
                  <section>
                    <SectionLabel icon={<User size={14} />} title="Datos personales" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Nombre <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            required
                            value={form.nombre}
                            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                            placeholder="Juan Pérez"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Cargo</label>
                        <div className="relative">
                          <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            value={form.cargo}
                            onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                            placeholder="Ingeniero Civil"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            required
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            disabled={!!editingUser}
                            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow disabled:bg-gray-50 disabled:text-gray-400"
                            placeholder="juan@empresa.com"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Teléfono</label>
                        <div className="relative">
                          <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            value={form.telefono}
                            onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                            placeholder="+57 300 000 0000"
                          />
                        </div>
                      </div>
                      {!editingUser && (
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">
                            Contraseña <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                              required={!editingUser}
                              type="password"
                              value={form.password}
                              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                              className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                              placeholder="••••••••"
                              minLength={6}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  <div className="h-px bg-gray-100" />

                  {/* Acceso y permisos — dos columnas */}
                  <section className="grid grid-cols-1 lg:grid-cols-5 gap-x-8 gap-y-6">
                    {/* Columna izquierda: perfiles + funcionalidades */}
                    <div className="lg:col-span-3 space-y-6">
                      {/* Perfiles */}
                      <div>
                        <SectionLabel icon={<ShieldCheck size={14} />} title="Perfiles" required />
                        <div className="flex flex-wrap gap-2">
                          {ROL_OPTIONS.map(([value, label]) => {
                            const active = form.roles.includes(value);
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => toggleRol(value)}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                                  active
                                    ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-100"
                                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                {active && <Check size={13} className="-ml-0.5" />}
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        {form.roles.length === 0 && (
                          <p className="text-xs text-red-600 mt-2">Selecciona al menos un perfil.</p>
                        )}
                      </div>

                      {/* Funcionalidades */}
                      {form.roles.length > 0 && (
                        <div>
                          <SectionLabel
                            icon={<ListChecks size={14} />}
                            title="Funcionalidades"
                            hint={`${form.funcionalidadesAdicionales.length} habilitadas`}
                          />
                          <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                            {Object.entries(TODAS_LAS_FUNCIONALIDADES).map(([slug, { nombre }]) => {
                              const funcionalidadesDelRol = form.roles.flatMap(
                                (rol) => FUNCIONALIDADES_POR_ROL[rol] || []
                              );
                              const estaEnRol = funcionalidadesDelRol.includes(slug);
                              const isChecked = form.funcionalidadesAdicionales.includes(slug);
                              const estatus = isChecked
                                ? estaEnRol ? "por_rol" : "adicional"
                                : estaEnRol ? "deshabilitada" : "no_seleccionada";

                              return (
                                <label
                                  key={slug}
                                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleFuncionalidad(slug)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                                  />
                                  <span className="flex-1 text-xs text-gray-700 leading-snug">{nombre}</span>
                                  {estatus === "por_rol" && (
                                    <span className="shrink-0 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium px-2 py-0.5">Por rol</span>
                                  )}
                                  {estatus === "adicional" && (
                                    <span className="shrink-0 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium px-2 py-0.5">Adicional</span>
                                  )}
                                  {estatus === "deshabilitada" && (
                                    <span className="shrink-0 rounded-full bg-red-50 text-red-600 text-[10px] font-medium px-2 py-0.5">Deshabilitada</span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Las marcadas son las funcionalidades habilitadas. Desactiva las que quieras quitar, incluso si vienen con el perfil.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Columna derecha: frentes */}
                    <div className="lg:col-span-2">
                      {needsFrente ? (
                        <>
                          <SectionLabel
                            icon={<MapPin size={14} />}
                            title="Frentes asignados"
                            hint={frentes.length > 0 ? `${form.frentesIds.length} seleccionados` : undefined}
                          />
                          {frentes.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center">
                              <MapPin size={20} className="mx-auto text-gray-300 mb-2" />
                              <p className="text-xs text-gray-400 italic">No hay frentes disponibles.</p>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-[22rem] overflow-y-auto">
                              {agruparFrentesPorProyectoYEtapa(frentes).map((group) => (
                                <div key={group.proyectoId} className="px-3 py-2.5">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{group.nombre}</p>
                                  <div className="space-y-2">
                                    {group.etapas.map((etapaGrupo) => (
                                      <div key={etapaGrupo.etapa ?? "sin-etapa"}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[11px] font-bold text-blue-600">
                                            {etapaGrupo.etapa !== null ? `Etapa ${etapaGrupo.etapa}` : "Sin etapa"}
                                          </span>
                                          <div className="flex-1 h-px bg-blue-100" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
                                          {etapaGrupo.items.map((f) => (
                                            <label key={f.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-1">
                                              <input
                                                type="checkbox"
                                                checked={form.frentesIds.includes(f.id)}
                                                onChange={() => toggleFrente(f.id)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                                              />
                                              <span className="text-xs text-gray-700 truncate">{f.nombre}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <SectionLabel icon={<MapPin size={14} />} title="Frentes asignados" />
                          <div className="rounded-xl bg-blue-50/70 border border-blue-100 px-4 py-5 flex items-start gap-3">
                            <ShieldCheck size={18} className="text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-blue-800 leading-relaxed">
                              Los perfiles seleccionados tienen acceso a todas las solicitudes. No requieren asignación de proyectos o frentes.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60 shrink-0">
                  <p className="text-xs text-gray-400 hidden sm:block">
                    {form.roles.length} perfil{form.roles.length !== 1 ? "es" : ""}
                    {needsFrente && frentes.length > 0 && ` · ${form.frentesIds.length} frente${form.frentesIds.length !== 1 ? "s" : ""}`}
                  </p>
                  <div className="flex items-center gap-3 ml-auto">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving || form.roles.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-100"
                    >
                      {saving && <Spinner size="sm" />}
                      {editingUser ? "Guardar cambios" : "Crear usuario"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
      {/* Bulk Assign Modal */}
      {bulkModalOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setBulkModalOpen(false)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Asignación Masiva de Frentes</h2>
                <button onClick={() => setBulkModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-gray-500">
                  Selecciona los frentes que deseas asignar a los <strong>{selectedIds.length}</strong> usuarios seleccionados.
                </p>
                <div className="max-h-[60vh] overflow-y-auto border border-gray-100 rounded-lg p-2 divide-y divide-gray-100">
                  {agruparFrentesPorProyectoYEtapa(frentes).map((group) => (
                    <div key={group.proyectoId} className="px-1 py-2 first:pt-1 last:pb-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{group.nombre}</p>
                      <div className="space-y-2">
                        {group.etapas.map((etapaGrupo) => (
                          <div key={etapaGrupo.etapa ?? "sin-etapa"}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-bold text-blue-600">
                                {etapaGrupo.etapa !== null ? `Etapa ${etapaGrupo.etapa}` : "Sin etapa"}
                              </span>
                              <div className="flex-1 h-px bg-blue-100" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                              {etapaGrupo.items.map((f) => (
                                <label key={f.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={bulkFrentesIds.includes(f.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) setBulkFrentesIds(prev => [...prev, f.id]);
                                      else setBulkFrentesIds(prev => prev.filter(id => id !== f.id));
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <p className="text-xs font-medium text-gray-800 truncate">{f.nombre}</p>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setBulkModalOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBulkAssignFrentes}
                  disabled={saving || bulkFrentesIds.length === 0}
                  className="flex-1 py-2 rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-100 transition-all"
                >
                  {saving ? "Guardando..." : "Asignar Frentes"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
