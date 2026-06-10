"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  User as UserIcon,
  Building2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Info,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { Spinner } from "@/shared/ui/spinner";

interface User {
  id: string;
  nombre: string;
  roles: string[];
  cargo?: string | null;
}

interface Frente {
  id: number;
  nombre: string;
  etapa?: number | null;
  proyecto: { nombre: string };
  aprobadorConfig?: {
    aprobadorIds: string;
    contratosTramiteIds: string;
    contratosMinutaIds: string;
    controlesId?: string | null;
    directorControlesIds: string;
  } | null;
  usuarios?: { userId: string; user?: User }[];
}

interface Props {
  frente: Frente;
  allUsers: User[];
}

function parseIds(json: string | undefined | null): string[] {
  try { return JSON.parse(json ?? "[]"); } catch { return []; }
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

function MultiPersonStep({
  label,
  ids,
  options,
  icon: Icon,
  onChange,
}: {
  label: string;
  ids: string[];
  options: User[];
  icon: React.ElementType;
  onChange: (ids: string[]) => void;
}) {
  const selectedUsers = ids.map(id => options.find(u => u.id === id)).filter(Boolean) as User[];
  const remaining = options.filter(u => !ids.includes(u.id));

  function remove(id: string) {
    onChange(ids.filter(i => i !== id));
  }

  function add(id: string) {
    if (id && !ids.includes(id)) onChange([...ids, id]);
  }

  return (
    <div className="group">
      <label className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block mb-2 group-focus-within:text-blue-600 transition-colors">
        {label}
      </label>

      <div className="space-y-2">
        {selectedUsers.map(user => (
          <div
            key={user.id}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 shrink-0">
              <Icon size={14} className="text-gray-500" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-800">{user.nombre}</span>
            <button
              type="button"
              onClick={() => remove(user.id)}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Quitar"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {remaining.length > 0 ? (
          <div className="relative">
            <select
              value=""
              onChange={(e) => { add(e.target.value); e.target.value = ""; }}
              className="w-full rounded-xl border-2 border-dashed border-gray-200 bg-white px-4 py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="">+ Agregar persona...</option>
              {remaining.map(u => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
              <Plus size={14} />
            </div>
          </div>
        ) : options.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-xs text-gray-400 italic text-center">
            No hay personal con el perfil requerido asignado a este frente.
          </p>
        ) : (
          <p className="rounded-xl border border-dashed border-green-200 bg-green-50/40 px-4 py-3 text-xs text-green-600 text-center">
            Todos los responsables disponibles han sido asignados.
          </p>
        )}
      </div>
    </div>
  );
}

export default function FrenteDetalle({ frente, allUsers }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [aprobadorIds, setAprobadorIds] = useState<string[]>(
    parseIds(frente.aprobadorConfig?.aprobadorIds)
  );
  const [contratosTramiteIds, setContratosTramiteIds] = useState<string[]>(
    parseIds(frente.aprobadorConfig?.contratosTramiteIds)
  );
  const [contratosMinutaIds, setContratosMinutaIds] = useState<string[]>(
    parseIds(frente.aprobadorConfig?.contratosMinutaIds)
  );
  const [directorControlesIds, setDirectorControlesIds] = useState<string[]>(
    parseIds(frente.aprobadorConfig?.directorControlesIds)
  );

  const filterByRole = (role: string) =>
    allUsers.filter(u => u.roles.includes(role));

  const directoresProyecto = filterByRole("DIRECTOR_PROYECTO");
  const personalContratos = filterByRole("CONTRATOS");
  const directoresControles = filterByRole("DIRECTOR_CONTROLES");

  const assignedUserIds = frente.usuarios?.map(fu => fu.userId) ?? [];
  const assignedUsers = allUsers.filter(u => assignedUserIds.includes(u.id));

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
          aprobadorIds,
          contratosTramiteIds,
          contratosMinutaIds,
          directorControlesIds,
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
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{frente.nombre}</h1>
              {frente.etapa && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 rounded-full px-3 py-1">
                  <Layers size={12} />
                  Etapa {frente.etapa}
                </span>
              )}
            </div>
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
        {/* Left Column: Info + Personal Asignado */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
              <Building2 size={16} className="text-gray-500" />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Información General</h3>
            </div>
            <div className="p-6 space-y-5">
              <InfoRow label="Proyecto" value={frente.proyecto.nombre} icon={Building2} />
              <InfoRow
                label="Etapa"
                value={
                  frente.etapa
                    ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5">
                        <Layers size={11} />
                        Etapa {frente.etapa}
                      </span>
                    )
                    : <span className="text-gray-400 italic text-sm">Sin etapa asignada</span>
                }
                icon={Layers}
              />
            </div>
          </div>

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

        {/* Right Column: Flujo de Aprobación */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
              <ShieldCheck size={16} className="text-amber-600" />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Flujo de Aprobación Granular</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Define quiénes serán responsables de cada hito en el flujo de trabajo de este frente. Puedes asignar múltiples personas por paso — cualquiera de ellas podrá realizar la acción.
              </p>

              <form onSubmit={handleSave} className="space-y-6">
                <MultiPersonStep
                  label="1. Aprobación Director (Director de Proyecto)"
                  ids={aprobadorIds}
                  options={directoresProyecto}
                  icon={UserIcon}
                  onChange={setAprobadorIds}
                />

                <MultiPersonStep
                  label="2. Trámite Contratos (Contratos)"
                  ids={contratosTramiteIds}
                  options={personalContratos}
                  icon={Building2}
                  onChange={setContratosTramiteIds}
                />

                <MultiPersonStep
                  label="3. Creación de Minuta (Contratos)"
                  ids={contratosMinutaIds}
                  options={personalContratos}
                  icon={Building2}
                  onChange={setContratosMinutaIds}
                />

                {/* Paso 4: abierto a cualquier usuario con perfil Controles */}
                <div>
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                    4. Registro ADPRO (Coordinador Controles)
                  </p>
                  <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3.5">
                    <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-blue-700 leading-relaxed">
                      Cualquier usuario con perfil <strong>Controles</strong> puede realizar esta acción. No requiere asignación específica.
                    </p>
                  </div>
                </div>

                <MultiPersonStep
                  label="5. Aprobación Final (Director de Controles)"
                  ids={directorControlesIds}
                  options={directoresControles}
                  icon={ShieldCheck}
                  onChange={setDirectorControlesIds}
                />

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
