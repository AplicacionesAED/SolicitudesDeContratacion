"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Users, 
  ShieldCheck, 
  Settings, 
  User as UserIcon, 
  Building2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";

interface User {
  id: string;
  nombre: string;
  roles: string[];
  cargo?: string | null;
}

interface Frente {
  id: number;
  nombre: string;
  proyecto: { nombre: string };
  aprobadorConfig?: {
    aprobadorId: string;
    contratosTramiteId?: string | null;
    contratosMinutaId?: string | null;
    controlesId?: string | null;
    directorControlesId?: string | null;
  } | null;
  usuarios?: { userId: string; user?: User }[];
}

interface Props {
  frente: Frente;
  allUsers: User[];
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 shrink-0">
          <Icon size={14} className="text-gray-500" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">
          {label}
        </p>
        <div className="text-sm text-gray-900 font-medium leading-snug">
          {value ?? <span className="text-gray-400 italic">—</span>}
        </div>
      </div>
    </div>
  );
}

export default function FrenteDetalleClient({ frente, allUsers }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [aprobadorId, setAprobadorId] = useState(frente.aprobadorConfig?.aprobadorId ?? "");
  const [contratosTramiteId, setContratosTramiteId] = useState(frente.aprobadorConfig?.contratosTramiteId ?? "");
  const [contratosMinutaId, setContratosMinutaId] = useState(frente.aprobadorConfig?.contratosMinutaId ?? "");
  const [controlesId, setControlesId] = useState(frente.aprobadorConfig?.controlesId ?? "");
  const [directorControlesId, setDirectorControlesId] = useState(frente.aprobadorConfig?.directorControlesId ?? "");

  // Assigned users in this frente
  const assignedUserIds = frente.usuarios?.map(fu => fu.userId) ?? [];
  const assignedUsers = allUsers.filter(u => assignedUserIds.includes(u.id));

  // Filter helpers
  const filterByRole = (role: string) => {
    return assignedUsers.filter(u => u.roles.includes(role) || u.roles.includes("ADMIN"));
  };

  const directoresProyecto = filterByRole("DIRECTOR_PROYECTO");
  const personalContratos = filterByRole("CONTRATOS");
  const coordinadoresControles = filterByRole("CONTROLES");
  const directoresControles = filterByRole("DIRECTOR_CONTROLES");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/frentes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: frente.id,
          aprobadorId: aprobadorId || null,
          contratosTramiteId: contratosTramiteId || null,
          contratosMinutaId: contratosMinutaId || null,
          controlesId: controlesId || null,
          directorControlesId: directorControlesId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar la configuración");
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header with back button */}
      <div>
        <Link
          href="/configuracion/frentes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver a Frentes
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{frente.nombre}</h1>
            <p className="text-sm text-gray-500 font-medium mt-1 flex items-center gap-2">
              <Building2 size={14} />
              {frente.proyecto.nombre}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {success && (
              <span className="flex items-center gap-1.5 text-green-600 text-sm font-bold animate-in fade-in slide-in-from-right-2">
                <CheckCircle2 size={16} />
                ¡Cambios guardados!
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100"
            >
              {saving && <Spinner size="sm" />}
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium flex items-center gap-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Asignado */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Personal Asignado</h3>
            </div>
            <div className="p-6">
              {assignedUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-xs text-gray-400 italic">No hay personal asignado a este frente.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {assignedUsers.map(user => (
                    <InfoRow 
                      key={user.id}
                      label={user.cargo ?? "Sin cargo"}
                      value={user.nombre}
                      icon={UserIcon}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-blue-50/30 border-t border-blue-50">
              <p className="text-[10px] text-blue-600 font-medium leading-relaxed">
                Para asignar más personal, dirígete a la sección de <strong>Usuarios</strong> y vincula los frentes correspondientes a cada perfil.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Configuración de Aprobadores */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
              <ShieldCheck size={16} className="text-amber-600" />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Flujo de Aprobación Granular</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Define quién será el responsable de cada hito en el flujo de trabajo de este frente. Solo el personal asignado a este frente con los perfiles adecuados aparecerá en los selectores.
              </p>

              <form onSubmit={handleSave} className="space-y-6">
                {[
                  { label: "1. Aprobación Director (Director de Proyecto)", value: aprobadorId, setter: setAprobadorId, options: directoresProyecto, icon: UserIcon },
                  { label: "2. Trámite Contratos (Contratos)", value: contratosTramiteId, setter: setContratosTramiteId, options: personalContratos, icon: Building2 },
                  { label: "3. Creación de Minuta (Contratos)", value: contratosMinutaId, setter: setContratosMinutaId, options: personalContratos, icon: Building2 },
                  { label: "4. Agregar Minuta (Coordinador Controles)", value: controlesId, setter: setControlesId, options: coordinadoresControles, icon: Settings },
                  { label: "5. Aprobación Final (Director de Controles)", value: directorControlesId, setter: setDirectorControlesId, options: directoresControles, icon: ShieldCheck },
                ].map((item, idx) => (
                  <div key={idx} className="group">
                    <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block mb-2 group-focus-within:text-blue-600 transition-colors">
                      {item.label}
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-blue-500 transition-colors">
                        <item.icon size={16} />
                      </div>
                      <select
                        value={item.value}
                        onChange={(e) => item.setter(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white pl-11 pr-10 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all appearance-none text-gray-700 shadow-sm"
                      >
                        <option value="">Seleccionar responsable...</option>
                        {item.options.map(u => (
                          <option key={u.id} value={u.id}>{u.nombre}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                        <Settings size={14} />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-6 border-t border-gray-50 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-gray-900 px-8 py-3 text-sm font-bold text-white hover:bg-black disabled:opacity-50 transition-all shadow-xl shadow-gray-200 flex items-center gap-2"
                  >
                    {saving && <Spinner size="sm" />}
                    Guardar Cambios del Frente
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
