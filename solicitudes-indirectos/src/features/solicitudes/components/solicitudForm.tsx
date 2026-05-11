"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Info,
  FileUp,
  ArrowLeft,
  Save,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Spinner } from "@/shared/ui/spinner";
import { CronogramaBuilder, type CronogramaData } from "@/features/solicitudes/components/cronogramaBuilder";
import { formatDate, formatCurrency, numeroALetras } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Frente {
  id: number;
  nombre: string;
  proyectoId: number;
  proyecto: { id: number; nombre: string; activo: boolean };
  aprobadorConfig?: { id: number; aprobadorId: string; frenteId: number } | null;
  usuarios?: { userId: string; frenteId: number }[];
}

interface Tercero {
  id: number;
  razonSocial: string;
  nit: string;
  representanteLegal: string;
  cedulaRepresentante: string;
  correoFirma: string;
  direccionRepresentante: string;
  telefonoRepresentante: string;
  nombreContacto?: string | null;
  telefonoContacto?: string | null;
  correoContacto?: string | null;
  tipoContrato: string;
  aprobadoDebidaDiligencia: boolean;
  confidencialidad: boolean;
  fechaVencimientoSagrilaft?: string | null;
}

function sagrilaftBadge(fechaVencimiento?: string | null) {
  if (!fechaVencimiento) return null;
  const dias = Math.ceil((new Date(fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (dias <= 0)
    return <span className="shrink-0 text-xs font-medium bg-red-100 text-red-700 rounded-full px-2 py-0.5">Vencido</span>;
  if (dias <= 20)
    return <span className="shrink-0 text-xs font-medium bg-red-100 text-red-700 rounded-full px-2 py-0.5">{dias}d SAGRILAFT</span>;
  if (dias <= 30)
    return <span className="shrink-0 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5">{dias}d SAGRILAFT</span>;
  return null;
}

const schema = z.object({
  frentesIds: z.array(z.number()).min(1, "Selecciona al menos un frente de trabajo"),
  terceroId: z.number({ message: "Selecciona un contratista" }).positive("Selecciona un contratista"),
  tipoContrato: z.enum(["OBRA", "DISENO"], { message: "Selecciona el tipo de contrato" }),
  descripcionActividad: z.string().min(50, "La descripción debe tener al menos 50 caracteres"),
  plazoEjecucion: z.string().min(1, "El plazo de ejecución es obligatorio"),
  formaPago: z.string().min(1, "La forma de pago es obligatoria"),
  valorFinal: z.number({ message: "Ingresa un número válido" }).min(0.01, "El valor debe ser mayor a 0"),
  asunto: z.string().min(1, "El asunto es obligatorio"),
  contratanteNombre: z.string().min(1, "El nombre del contratante es obligatorio"),
  contratanteNit: z.string().min(1, "El NIT del contratante es obligatorio"),
  alcance: z.string().optional(),
  terminosReferencia: z.string().optional(),
  condicionesEspeciales: z.string().optional(),
});

export type FormValues = {
  frentesIds: number[];
  terceroId: number;
  tipoContrato: "OBRA" | "DISENO";
  descripcionActividad: string;
  plazoEjecucion: string;
  formaPago: string;
  valorFinal: number;
  asunto: string;
  contratanteNombre: string;
  contratanteNit: string;
  alcance?: string;
  terminosReferencia?: string;
  condicionesEspeciales?: string;
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  badge,
  children,
  defaultOpen = true,
  collapsible = false,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen((p) => !p)}
        className={`flex w-full items-center justify-between px-5 py-4 text-left ${collapsible ? "cursor-pointer hover:bg-gray-50" : "cursor-default"
          }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          {badge && (
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
              {badge}
            </span>
          )}
        </div>
        {collapsible &&
          (open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />)}
      </button>
      {(!collapsible || open) && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-4">{children}</div>
      )}
    </div>
  );
}

// ─── File Upload Field ────────────────────────────────────────────────────────

function FileField({
  label,
  required,
  accept,
  value,
  onChange,
  error,
}: {
  label: string;
  required?: boolean;
  accept: string;
  value: string;
  onChange: (url: string) => void;
  error?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir archivo");
      onChange(data.url);
      setFileName(file.name);
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Error al subir archivo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div
        className={`flex items-center gap-3 border rounded-lg px-3 py-2 ${error ? "border-red-400" : "border-gray-300"
          } ${value ? "bg-green-50 border-green-300" : "bg-white"}`}
      >
        <FileUp size={16} className={value ? "text-green-600" : "text-gray-400"} />
        <span className="flex-1 truncate text-sm text-gray-600">
          {fileName || (value ? "Archivo cargado" : "Sin archivo")}
        </span>
        <label className="cursor-pointer shrink-0">
          <span className="text-xs font-medium text-blue-600 hover:text-blue-700">
            {uploading ? "Subiendo…" : value ? "Cambiar" : "Seleccionar"}
          </span>
          <input
            type="file"
            accept={accept}
            onChange={handleFile}
            className="sr-only"
            disabled={uploading}
          />
        </label>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const defaultCronograma: CronogramaData = {
  tieneFases: false,
  fechaInicio: "",
  fechaFin: "",
  fases: [],
  actividades: [{ descripcion: "", fechaInicio: "", fechaFin: "" }],
};

interface SolicitudFormProps {
  initialData?: any;
  initialCronograma?: CronogramaData;
  isEdit?: boolean;
  tipoSolicitud?: "CONTRATO" | "ORDEN_SERVICIO";
}

export function SolicitudForm({
  initialData,
  initialCronograma,
  isEdit = false,
  tipoSolicitud = "CONTRATO",
}: SolicitudFormProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [frentes, setFreentes] = useState<Frente[]>([]);
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [terceroSearch, setTerceroSearch] = useState("");
  const [loadingFreentes, setLoadingFreentes] = useState(true);
  const [loadingTerceros, setLoadingTerceros] = useState(true);

  const [archivoCuadroComparativo, setArchivoCuadroComparativo] = useState(initialData?.archivoCuadroComparativo || "");
  const [archivoCotizacion, setArchivoCotizacion] = useState(initialData?.archivoCotizacion || "");
  const [archivoBEP, setArchivoBEP] = useState(initialData?.archivoBEP || "");
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});

  const [cronograma, setCronograma] = useState<CronogramaData>(initialCronograma || defaultCronograma);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [cronogramaError, setCronogramaError] = useState("");
  const [valorEnLetras, setValorEnLetras] = useState("");
  const [selectedTercero, setSelectedTercero] = useState<Tercero | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      frentesIds: initialData?.frentesIds ? (typeof initialData.frentesIds === 'string' ? JSON.parse(initialData.frentesIds) : initialData.frentesIds) : [],
      terceroId: initialData?.terceroId || undefined,
      tipoContrato: tipoSolicitud === "ORDEN_SERVICIO" ? "OBRA" : (initialData?.tipoContrato as "OBRA" | "DISENO" | undefined),
      descripcionActividad: initialData?.descripcionActividad || "",
      plazoEjecucion: initialData?.plazoEjecucion || "",
      formaPago: initialData?.formaPago || "",
      valorFinal: initialData?.valorFinal ? Number(initialData.valorFinal) : undefined,
      asunto: initialData?.asunto || "",
      contratanteNombre: initialData?.contratanteNombre || "AED CONSTRUCTORES S.A.S",
      contratanteNit: initialData?.contratanteNit || "901237628-1",
      alcance: initialData?.alcance || "",
      terminosReferencia: initialData?.terminosReferencia || "",
      condicionesEspeciales: initialData?.condicionesEspeciales || "",
    },
  });

  const onInvalid = (errors: any) => {
    console.error("Form validation errors:", errors);
    setSubmitError("Hay errores en el formulario. Por favor revise todos los campos.");
  };

  const watchFrentesIds = watch("frentesIds");
  const watchTerceroId = watch("terceroId");
  const watchTipoContrato = watch("tipoContrato");
  const watchDescripcion = watch("descripcionActividad");
  const watchValorFinal = watch("valorFinal");

  useEffect(() => {
    fetch("/api/frentes")
      .then((r) => r.json())
      .then((data: Frente[]) => {
        const rol = session?.user?.rol;
        if (rol === "ADMIN" || rol === "CONTRATOS" || rol === "CONTROLES" || rol === "DIRECTOR_CONTROLES") {
          setFreentes(data);
        } else {
          const userId = session?.user?.id;
          const assigned = data.filter((f) =>
            f.usuarios?.some((u) => u.userId === userId)
          );
          setFreentes(assigned.length > 0 ? assigned : data);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingFreentes(false));
  }, [session]);

  useEffect(() => {
    fetch("/api/terceros?aprobado=true")
      .then((r) => r.json())
      .then(setTerceros)
      .catch(console.error)
      .finally(() => setLoadingTerceros(false));
  }, []);

  useEffect(() => {
    if (watchValorFinal && watchValorFinal > 0) {
      setValorEnLetras(numeroALetras(watchValorFinal));
    } else {
      setValorEnLetras("");
    }
  }, [watchValorFinal]);

  useEffect(() => {
    const t = terceros.find((t) => t.id === watchTerceroId) ?? null;
    setSelectedTercero(t);
  }, [watchTerceroId, terceros]);

  useEffect(() => {
    if (isEdit) return;
    const frenteNames = frentes
      .filter((f) => watchFrentesIds?.includes(f.id))
      .map((f) => f.nombre)
      .join(", ");
    const terceroName = selectedTercero?.razonSocial ?? "";
    const desc = watchDescripcion?.slice(0, 80) ?? "";
    if (frenteNames || terceroName || desc) {
      const prefijo = tipoSolicitud === "ORDEN_SERVICIO" ? "ORDEN DE SERVICIO" : "CONTRATO";
      const autoAsunto = `[${prefijo}] – ${frenteNames || "Frente(s)"} – ${terceroName || "Contratista"} – ${desc}`;
      setValue("asunto", autoAsunto, { shouldValidate: false });
    }
  }, [watchFrentesIds, selectedTercero, watchDescripcion, frentes, setValue, isEdit]);

  function validateCronograma(): boolean {
    const allActividades = cronograma.tieneFases
      ? cronograma.fases.flatMap((f) => f.actividades)
      : cronograma.actividades;
    if (!allActividades.some((a) => a.descripcion.trim().length > 0)) {
      setCronogramaError("Debes registrar al menos una actividad en el cronograma.");
      return false;
    }
    if (!allActividades.every((a) => a.descripcion.trim().length > 0)) {
      setCronogramaError("Todas las actividades del cronograma deben tener una descripción.");
      return false;
    }
    setCronogramaError("");
    return true;
  }

  function validateFiles(): boolean {
    const errs: Record<string, string> = {};
    if (!archivoCuadroComparativo) errs.cuadroComparativo = "El cuadro comparativo es obligatorio";
    if (!archivoCotizacion) errs.cotizacion = "La cotización es obligatoria";
    if (watchTipoContrato === "DISENO" && !archivoBEP) {
      errs.bep = "El BEP es obligatorio para contratos de diseño";
    }
    setFileErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function buildPayload(data: FormValues) {
    const firstFrente = frentes.find((f) => data.frentesIds.includes(f.id));
    const proyectoId = firstFrente?.proyectoId ?? 1;

    return {
      tipo: tipoSolicitud,
      proyectoId,
      frentesIds: data.frentesIds,
      terceroId: data.terceroId,
      descripcionActividad: data.descripcionActividad,
      plazoEjecucion: data.plazoEjecucion,
      formaPago: data.formaPago,
      valorFinal: data.valorFinal,
      tipoContrato: data.tipoContrato,
      asunto: data.asunto,
      contratanteNombre: data.contratanteNombre,
      contratanteNit: data.contratanteNit,
      alcance: data.alcance,
      terminosReferencia: data.terminosReferencia,
      condicionesEspeciales: data.condicionesEspeciales,
      valorEnLetras,
      archivoCuadroComparativo,
      archivoCotizacion,
      archivoBEP: archivoBEP || null,
    };
  }

  async function saveCronograma(solicitudId: number) {
    if (!cronograma.fechaInicio || !cronograma.fechaFin) return true;
    try {
      const res = await fetch(`/api/solicitudes/${solicitudId}/cronograma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cronograma),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Error al guardar el cronograma");
        return false;
      }
      return true;
    } catch (err) {
      setSubmitError("Error de conexión al guardar el cronograma");
      return false;
    }
  }

  async function onSaveDraft(data: FormValues) {
    validateFiles();
    if (!validateCronograma()) return;
    setSaving(true);
    setSubmitError("");
    try {
      const url = isEdit ? `/api/solicitudes/${initialData.id}` : "/api/solicitudes";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(data)),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      const solicitudId = isEdit ? initialData.id : json.id;

      const cronoOk = await saveCronograma(solicitudId);
      if (!cronoOk) {
        setSaving(false);
        return;
      }

      router.push(`/solicitudes/${solicitudId}`);
      router.refresh();
    } catch (err: any) {
      setSubmitError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function onSendForm(data: FormValues) {
    if (!validateFiles()) return;
    if (!validateCronograma()) return;
    setSending(true);
    setSubmitError("");
    try {
      const url = isEdit ? `/api/solicitudes/${initialData.id}` : "/api/solicitudes";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(data)),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      const solicitudId = isEdit ? initialData.id : json.id;

      const cronoOk = await saveCronograma(solicitudId);
      if (!cronoOk) {
        setSending(false);
        return;
      }

      const accion = (isEdit && (initialData.estado === "DEVUELTA" || initialData.estado === "EN_REVISION"))
        ? "REENVIAR"
        : "ENVIAR";

      const estadoRes = await fetch(`/api/solicitudes/${solicitudId}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      if (!estadoRes.ok) {
        const d = await estadoRes.json();
        throw new Error(d.error ?? "Error al enviar la solicitud");
      }
      router.push(`/solicitudes/${solicitudId}`);
    } catch (err: any) {
      setSubmitError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSending(false);
    }
  }

  const today = formatDate(new Date());

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={15} />
          Volver
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-500">{isEdit ? "Editar Solicitud" : "Nueva Solicitud"}</span>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-800">
          {tipoSolicitud === "ORDEN_SERVICIO" ? "Orden de Servicio" : "Contrato"}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit
            ? tipoSolicitud === "ORDEN_SERVICIO" ? "Editar Orden de Servicio" : "Editar Solicitud de Contrato"
            : tipoSolicitud === "ORDEN_SERVICIO" ? "Orden de Servicio" : "Solicitud de Contrato"}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isEdit ? "Modifica los campos necesarios para actualizar la solicitud." : "Complete todos los campos para generar la solicitud."}
        </p>
      </div>

      <Section title="Encabezado" badge="Automático">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Fecha de solicitud</p>
            <p className="text-sm text-gray-900 font-medium">{isEdit ? formatDate(initialData.createdAt) : today}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Consecutivo</p>
            <p className="text-sm text-gray-900 font-mono font-bold">{isEdit ? initialData.consecutivo : "Se generará al enviar"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Solicitante</p>
            <p className="text-sm text-gray-900 font-medium">{isEdit ? initialData.solicitante?.nombre : session?.user?.name ?? "—"}</p>
            <p className="text-xs text-gray-500">{isEdit ? initialData.solicitante?.cargo : (session?.user as any)?.cargo ?? "—"}</p>
          </div>
        </div>
      </Section>

      <Section title="Sección 1 — Información del Formulario">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Frente(s) de Trabajo <span className="text-red-500">*</span>
          </label>
          {loadingFreentes ? (
            <div className="flex items-center gap-2 text-sm text-gray-400"><Spinner size="sm" /> Cargando frentes…</div>
          ) : frentes.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} /> No hay frentes asignados.
            </div>
          ) : (
            <Controller
              name="frentesIds"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {frentes.map((frente) => {
                    const checked = field.value?.includes(frente.id) ?? false;
                    return (
                      <label key={frente.id} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${checked ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                        <input type="checkbox" checked={checked} onChange={(e) => {
                          const next = e.target.checked ? [...(field.value ?? []), frente.id] : (field.value ?? []).filter((id: number) => id !== frente.id);
                          field.onChange(next);
                        }} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{frente.nombre}</p>
                          <p className="text-xs text-gray-500">{frente.proyecto.nombre}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            />
          )}
          {errors.frentesIds && <p className="text-xs text-red-500 mt-1">{errors.frentesIds.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Nombre del Tercero (Contratista) <span className="text-red-500">*</span></label>
          {loadingTerceros ? (
            <div className="flex items-center gap-2 text-sm text-gray-400"><Spinner size="sm" /> Cargando contratistas…</div>
          ) : (
            <Controller
              name="terceroId"
              control={control}
              render={({ field }) => {
                const [open, setOpen] = useState(false);
                const selected = terceros.find((t) => t.id === field.value) ?? null;
                const filtered = terceros.filter((t) => {
                  if (!t.aprobadoDebidaDiligencia || !t.confidencialidad) return false;
                  if (t.fechaVencimientoSagrilaft) {
                    const dias = Math.ceil((new Date(t.fechaVencimientoSagrilaft).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    if (dias <= 0) return false;
                  }
                  if (!terceroSearch) return true;
                  const q = terceroSearch.toLowerCase();
                  return t.razonSocial.toLowerCase().includes(q);
                });
                return (
                  <div className="relative">
                    <div className={`flex items-center gap-2 rounded-md border px-3 py-2 bg-white cursor-text ${errors.terceroId ? "border-red-400" : "border-gray-300"} ${open ? "ring-2 ring-blue-500 border-blue-500" : "hover:border-gray-400"}`} onClick={() => !selected && setOpen(true)}>
                      {selected ? (
                        <>
                          <span className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="text-sm text-gray-900 font-medium truncate">{selected.razonSocial}</span>
                            {sagrilaftBadge(selected.fechaVencimientoSagrilaft)}
                          </span>
                          <button type="button" onClick={() => { field.onChange(undefined); setTerceroSearch(""); setOpen(true); }} className="shrink-0 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                        </>
                      ) : (
                        <input autoFocus={open} type="text" value={terceroSearch} onChange={(e) => { setTerceroSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Buscar por razón social…" className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent" />
                      )}
                    </div>
                    {open && !selected && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {filtered.length === 0 ? (
                          <div className="flex items-center gap-2 px-3 py-3 text-xs text-amber-700 bg-amber-50">
                            <AlertCircle size={13} className="shrink-0" />
                            <span>No encontrado. <a href="/terceros" className="underline font-medium">Ir al módulo de Terceros.</a></span>
                          </div>
                        ) : (
                          filtered.map((t) => (
                            <button key={t.id} type="button" onClick={() => { field.onChange(t.id); setTerceroSearch(""); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-blue-50 transition-colors">
                              <span className="flex-1 font-medium text-gray-900">{t.razonSocial}</span>
                              {sagrilaftBadge(t.fechaVencimientoSagrilaft)}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              }}
            />
          )}
          {errors.terceroId && <p className="text-xs text-red-500 mt-1">{errors.terceroId.message}</p>}
        </div>

        {tipoSolicitud === "CONTRATO" && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Tipo de Contrato <span className="text-red-500">*</span></label>
            <Controller
              name="tipoContrato"
              control={control}
              render={({ field }) => (
                <div className="flex gap-4">
                  {(["OBRA", "DISENO"] as const).map((opt) => (
                    <label key={opt} className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer transition-colors ${field.value === opt ? "border-blue-400 bg-blue-50 text-blue-800" : "border-gray-200 hover:border-gray-300 text-gray-700"}`}>
                      <input type="radio" checked={field.value === opt} onChange={() => field.onChange(opt)} className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium">{opt === "OBRA" ? "Otros Servicios" : "Diseño"}</span>
                    </label>
                  ))}
                </div>
              )}
            />
            {watchTipoContrato === "DISENO" && (
              <div className="mt-2 flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <Info size={13} className="mt-0.5 shrink-0" /> Los contratos de diseño requieren adjuntar el archivo BEP.
              </div>
            )}
            {errors.tipoContrato && <p className="text-xs text-red-500 mt-1">{errors.tipoContrato.message}</p>}
          </div>
        )}

        <Textarea label="Descripción de la Actividad" required placeholder="Describa en detalle las actividades a contratar (mínimo 50 caracteres)…" showCount rows={4} {...register("descripcionActividad")} error={errors.descripcionActividad?.message} />
        <Input label="Plazo de Ejecución" required placeholder="Ej: 25 días calendario a partir del anticipo" {...register("plazoEjecucion")} error={errors.plazoEjecucion?.message} />
        <Textarea label="Forma de Pago" required placeholder="Ej: 50% anticipo al inicio, 50% a la entrega final" rows={3} {...register("formaPago")} error={errors.formaPago?.message} />
      </Section>

      <Section title="Sección 2 — Documentos a Anexar">
        <FileField label="Cuadro Comparativo" required accept=".xlsx,.xls" value={archivoCuadroComparativo} onChange={setArchivoCuadroComparativo} error={fileErrors.cuadroComparativo} />
        <FileField label="Cotización" required accept=".pdf" value={archivoCotizacion} onChange={setArchivoCotizacion} error={fileErrors.cotizacion} />
        {watchTipoContrato === "DISENO" && (
          <FileField label="BEP (Bases de Especificaciones del Proyecto)" required accept=".pdf" value={archivoBEP} onChange={setArchivoBEP} error={fileErrors.bep} />
        )}
      </Section>

      <Section title="Sección 3 — Valor Final">
        <div className="space-y-3">
          <Controller
            name="valorFinal"
            control={control}
            render={({ field }) => (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Valor del Contrato (COP) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-sm text-gray-500 font-medium pointer-events-none">$</span>
                  <input type="number" min={0} step={1} placeholder="0" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} className={`block w-full rounded-md border pl-7 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.valorFinal ? "border-red-400 focus:ring-red-400" : "border-gray-300 hover:border-gray-400"}`} />
                </div>
                {field.value && field.value > 0 && <p className="mt-1 text-sm text-gray-500">{formatCurrency(field.value)}</p>}
                {errors.valorFinal && <p className="text-xs text-red-500 mt-1">{errors.valorFinal.message}</p>}
              </div>
            )}
          />
          {valorEnLetras && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Valor en letras</p>
              <p className="text-sm text-gray-800 font-medium">{valorEnLetras}</p>
            </div>
          )}
        </div>
      </Section>

      <Section title="Sección 4 — Asunto">
        <Textarea label="Asunto (auto-generado, editable)" required rows={2} {...register("asunto")} error={errors.asunto?.message} />
        <p className="text-xs text-gray-400 flex items-center gap-1"><Info size={11} /> Se actualiza automáticamente al cambiar el frente, contratista o descripción.</p>
      </Section>

      <Section title="Sección 5 — Formato de Solicitud" collapsible badge="*">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Área / Frente</p>
              <p className="text-sm text-gray-800">{frentes.filter((f) => watchFrentesIds?.includes(f.id)).map((f) => f.nombre).join(", ") || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Solicitante</p>
              <p className="text-sm text-gray-800">{isEdit ? initialData.solicitante?.nombre : session?.user?.name ?? "—"}</p>
              <p className="text-xs text-gray-500">{isEdit ? initialData.solicitante?.cargo : (session?.user as any)?.cargo ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Proyecto</p>
              <p className="text-sm text-gray-800">
                {Array.from(new Set(frentes.filter(f => watchFrentesIds?.includes(f.id)).map(f => f.proyecto.nombre))).join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tipo</p>
              <p className="text-sm text-gray-800">
                {tipoSolicitud === "ORDEN_SERVICIO"
                  ? "Orden de Servicio"
                  : watchTipoContrato === "OBRA" ? "Otros Servicios" : watchTipoContrato === "DISENO" ? "Diseño" : "—"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Contratante — Nombre" {...register("contratanteNombre")} error={errors.contratanteNombre?.message} />
            <Input label="Contratante — NIT" {...register("contratanteNit")} error={errors.contratanteNit?.message} />
          </div>
          {selectedTercero && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Datos del Contratista</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {[
                  ["Razón Social", selectedTercero.razonSocial],
                  ["NIT", selectedTercero.nit],
                  ["Representante Legal", selectedTercero.representanteLegal],
                  ["Cédula Representante", selectedTercero.cedulaRepresentante],
                  ["Correo de Firma", selectedTercero.correoFirma],
                  ["Dirección Representante", selectedTercero.direccionRepresentante],
                  ["Teléfono Representante", selectedTercero.telefonoRepresentante],
                  ...(selectedTercero.nombreContacto ? [["Nombre Contacto", selectedTercero.nombreContacto]] : []),
                  ...(selectedTercero.telefonoContacto ? [["Teléfono Contacto", selectedTercero.telefonoContacto]] : []),
                  ...(selectedTercero.correoContacto ? [["Correo Contacto", selectedTercero.correoContacto]] : []),
                ].map(([k, v]) => (
                  <div key={k}><span className="text-xs text-gray-500">{k}: </span><span className="text-gray-800">{v}</span></div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Objeto</p>
            <p className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-h-[3rem]">
              {watchDescripcion || <span className="text-gray-400 italic">Se completará con la descripción de actividad.</span>}
            </p>
          </div>
          <Textarea label="Alcance" placeholder="Describa el alcance del contrato…" rows={3} {...register("alcance")} error={errors.alcance?.message} />
          <Textarea label="Términos de referencia / Especificaciones técnicas" placeholder="Describa los términos de referencia…" rows={3} {...register("terminosReferencia")} error={errors.terminosReferencia?.message} />
          {watchValorFinal && watchValorFinal > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Valor a Contratar</p>
              <p className="text-sm text-gray-800 font-semibold">{formatCurrency(watchValorFinal)}</p>
              {valorEnLetras && <p className="text-xs text-gray-500 mt-0.5">{valorEnLetras}</p>}
            </div>
          )}
          <Textarea label="Condiciones Especiales" placeholder="Indique condiciones especiales…" rows={3} {...register("condicionesEspeciales")} error={errors.condicionesEspeciales?.message} />
        </div>
      </Section>

      <Section title="Cronograma" collapsible defaultOpen={true}>
        <CronogramaBuilder value={cronograma} onChange={(data) => { setCronograma(data); setCronogramaError(""); }} />
        {cronogramaError && (
          <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
            <AlertCircle size={13} className="shrink-0" />
            {cronogramaError}
          </div>
        )}
      </Section>

      {submitError && (
        <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {submitError}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3 sm:justify-end pt-2">
        <Button
          type="button"
          variant={isEdit ? "primary" : "secondary"}
          size="lg"
          loading={saving}
          disabled={sending}
          onClick={handleSubmit(onSaveDraft, onInvalid)}
        >
          <Save size={16} />
          {isEdit ? "Guardar Cambios" : "Guardar Borrador"}
        </Button>

        {!isEdit && (
          <Button
            type="button"
            variant="primary"
            size="lg"
            loading={sending}
            disabled={saving}
            onClick={handleSubmit(onSendForm, onInvalid)}
          >
            <Send size={16} />
            Guardar y Enviar
          </Button>
        )}
      </div>
    </div>
  );
}
