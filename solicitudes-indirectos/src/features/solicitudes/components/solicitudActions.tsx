"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  CheckCircle,
  RotateCcw,
  ClipboardCheck,
  Hash,
  ThumbsUp,
  ChevronRight,
  Link2,
  PenLine,
  Trash2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import { useToast } from "@/shared/ui/toaster";
import { Spinner } from "@/shared/ui/spinner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Anexo {
  url: string;
  nombre: string;
}

interface SolicitudActionsProps {
  solicitud: {
    id: number;
    estado: string;
    solicitanteId: string;
    aprobadorId?: string | null;
    consecutivo: string;
    archivosAnexos?: string | null;
    tieneOtrosis?: boolean;
  };
  userSession: {
    user: {
      id: string;
      rol: string;
      roles?: string[];
    };
  } | null;
}

type AccionEstado =
  | "ENVIAR"
  | "APROBAR_DIRECTOR_TECNICO"
  | "APROBAR_DIRECTOR"
  | "DEVOLVER"
  | "REVISAR"
  | "TRAMITAR_OK"
  | "AVANZAR_CONTRATOS"
  | "REGISTRAR_ADPRO"
  | "APROBAR_FINAL"
  | "REENVIAR";

// ─── Component ────────────────────────────────────────────────────────────────

export function SolicitudActions({ solicitud, userSession }: SolicitudActionsProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [nombreInput, setNombreInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [nombreError, setNombreError] = useState("");
  const [savingAnexo, setSavingAnexo] = useState(false);
  const [anexos, setAnexos] = useState<Anexo[]>(() => {
    try { return JSON.parse(solicitud.archivosAnexos || "[]"); } catch { return []; }
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<
    | "enviar"
    | "aprobar_tecnico"
    | "devolver_tecnico"
    | "aprobar"
    | "devolver"
    | "contratos"
    | "adpro"
    | "aprobar_final"
    | "reenviar"
    | "eliminar"
    | null
  >(null);
  const [nota, setNota] = useState("");
  const [contratosOpcion, setContratosOpcion] = useState<"OK" | "REVISAR">("OK");
  const [notaContratos, setNotaContratos] = useState("");
  const [adproNum, setAdproNum] = useState("");

  const { estado, solicitanteId, aprobadorId } = solicitud;
  const userId = userSession?.user?.id;
  const rol = userSession?.user?.rol;
  const userRoles: string[] = userSession?.user?.roles ?? (rol ? [rol] : []);
  const isAdmin = userRoles.includes("ADMIN");

  // ── Visibility rules ────────────────────────────────────────────────────────

  const canEnviar =
    estado === "BORRADOR" &&
    (userRoles.includes("SOLICITANTE") || userRoles.includes("TECNICA") || userRoles.includes("DIRECTOR_PROYECTO")) &&
    solicitanteId === userId;

  const canAprobarDirectorTecnico =
    estado === "PENDIENTE_DIRECTOR_TECNICO" &&
    userRoles.includes("DIRECTOR_TECNICO");

  const canDevolverTecnico =
    estado === "PENDIENTE_DIRECTOR_TECNICO" &&
    userRoles.includes("DIRECTOR_TECNICO");

  const canAprobarDirector =
    estado === "ENVIADA" &&
    userRoles.includes("DIRECTOR_PROYECTO") &&
    (!aprobadorId || aprobadorId === userId);

  const canDevolver =
    estado === "ENVIADA" &&
    userRoles.includes("DIRECTOR_PROYECTO") &&
    (!aprobadorId || aprobadorId === userId);

  const canContratosAction =
    (estado === "APROBADA_DIRECTOR" || estado === "EN_TRAMITE_CONTRATOS") &&
    userRoles.includes("CONTRATOS");

  const showAnexosUpload =
    estado === "CREACION_MINUTA" && userRoles.includes("CONTRATOS");

  const canAvanzarContratos =
    estado === "CREACION_MINUTA" && userRoles.includes("CONTRATOS") && anexos.length > 0;

  const canRegistrarAdpro =
    estado === "EN_CONTROLES" && userRoles.includes("CONTROLES");

  const canAprobarFinal =
    estado === "APROBACION_FINAL" && userRoles.includes("DIRECTOR_CONTROLES");

  const canReenviar =
    (estado === "DEVUELTA" || estado === "EN_REVISION") &&
    (userRoles.includes("SOLICITANTE") || userRoles.includes("TECNICA") || userRoles.includes("DIRECTOR_PROYECTO")) &&
    solicitanteId === userId;

  const canEdit =
    ((estado === "BORRADOR" || estado === "DEVUELTA" || estado === "EN_REVISION") &&
      solicitanteId === userId) ||
    // ADMIN can edit a solicitud in any state
    isAdmin;

  const hasAnyAction =
    canEnviar ||
    canAprobarDirectorTecnico ||
    canDevolverTecnico ||
    canAprobarDirector ||
    canDevolver ||
    canContratosAction ||
    showAnexosUpload ||
    canAvanzarContratos ||
    canRegistrarAdpro ||
    canAprobarFinal ||
    canReenviar ||
    canEdit ||
    isAdmin;

  if (!hasAnyAction) return null;

  // ── API call ────────────────────────────────────────────────────────────────

  async function executeAction(
    accion: AccionEstado,
    extra: Record<string, string> = {}
  ) {
    setLoading(true);
    try {
      const res = await fetch(`/api/solicitudes/${solicitud.id}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, ...extra }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error ?? "Error al ejecutar la acción", "error");
        return;
      }

      addToast("Acción ejecutada correctamente", "success");
      setModalOpen(false);
      setNota("");
      setNotaContratos("");
      setAdproNum("");
      router.refresh();
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleEliminar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/solicitudes/${solicitud.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error ?? "Error al eliminar la solicitud", "error");
        return;
      }
      addToast("Solicitud eliminada correctamente", "success");
      setModalOpen(false);
      router.push("/solicitudes");
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  }

  // ── Anexos por URL ───────────────────────────────────────────────────────────

  function detectPlatform(url: string): { label: string; chipClass: string } {
    if (/sharepoint\.com|1drv\.ms|onedrive\.live\.com/i.test(url))
      return { label: "SharePoint", chipClass: "bg-blue-50 border-blue-200 text-blue-800" };
    if (/drive\.google\.com|docs\.google\.com/i.test(url))
      return { label: "Google Drive", chipClass: "bg-green-50 border-green-200 text-green-800" };
    if (/dropbox\.com/i.test(url))
      return { label: "Dropbox", chipClass: "bg-gray-50 border-gray-200 text-gray-700" };
    return { label: "Enlace", chipClass: "bg-gray-50 border-gray-200 text-gray-700" };
  }

  async function handleAddUrl() {
    let valid = true;
    if (!nombreInput.trim()) { setNombreError("El nombre es obligatorio"); valid = false; } else setNombreError("");
    if (!urlInput.trim()) { setUrlError("La URL es obligatoria"); valid = false; }
    else if (!/^https?:\/\/.+/i.test(urlInput.trim())) { setUrlError("Debe ser una URL válida (https://...)"); valid = false; }
    else setUrlError("");
    if (!valid) return;

    setSavingAnexo(true);
    try {
      const updatedAnexos = [...anexos, { url: urlInput.trim(), nombre: nombreInput.trim() }];
      const patchRes = await fetch(`/api/solicitudes/${solicitud.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivosAnexos: JSON.stringify(updatedAnexos) }),
      });
      if (!patchRes.ok) {
        const d = await patchRes.json();
        throw new Error(d.error ?? "Error al guardar el enlace");
      }
      setAnexos(updatedAnexos);
      setUrlInput("");
      setNombreInput("");
      addToast("Enlace agregado correctamente", "success");
      router.refresh();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al guardar el enlace", "error");
    } finally {
      setSavingAnexo(false);
    }
  }

  async function removeAnexo(idx: number) {
    const updated = anexos.filter((_, i) => i !== idx);
    const patchRes = await fetch(`/api/solicitudes/${solicitud.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivosAnexos: JSON.stringify(updated) }),
    });
    if (patchRes.ok) {
      setAnexos(updated);
      router.refresh();
    }
  }

  // ── Modal handlers ──────────────────────────────────────────────────────────

  function openModal(type: typeof modalType) {
    setModalType(type);
    setNota("");
    setContratosOpcion("OK");
    setNotaContratos("");
    setAdproNum("");
    setModalOpen(true);
  }

  function closeModal() {
    if (loading) return;
    setModalOpen(false);
    setModalType(null);
  }

  async function handleModalConfirm() {
    if (modalType === "enviar") {
      await executeAction("ENVIAR");
    } else if (modalType === "aprobar_tecnico") {
      await executeAction("APROBAR_DIRECTOR_TECNICO");
    } else if (modalType === "devolver_tecnico") {
      if (!nota.trim()) {
        addToast("La nota es obligatoria para devolver", "error");
        return;
      }
      await executeAction("DEVOLVER", { nota });
    } else if (modalType === "aprobar") {
      await executeAction("APROBAR_DIRECTOR");
    } else if (modalType === "devolver") {
      if (!nota.trim()) {
        addToast("La nota es obligatoria para devolver", "error");
        return;
      }
      await executeAction("DEVOLVER", { nota });
    } else if (modalType === "contratos") {
      if (contratosOpcion === "OK") {
        await executeAction("TRAMITAR_OK", notaContratos ? { nota: notaContratos } : {});
      } else {
        if (!notaContratos.trim()) {
          addToast("La nota es obligatoria cuando se requiere revisión", "error");
          return;
        }
        await executeAction("REVISAR", { nota: notaContratos });
      }
    } else if (modalType === "adpro") {
      if (!adproNum.trim()) {
        addToast("El número de contrato Adpro es obligatorio", "error");
        return;
      }
      await executeAction("REGISTRAR_ADPRO", { numeroContratoAdpro: adproNum });
    } else if (modalType === "aprobar_final") {
      await executeAction("APROBAR_FINAL");
    } else if (modalType === "reenviar") {
      await executeAction("REENVIAR");
    } else if (modalType === "eliminar") {
      await handleEliminar();
    }
  }

  // ── Modal content ───────────────────────────────────────────────────────────

  function getModalTitle() {
    switch (modalType) {
      case "enviar": return "Confirmar envío de solicitud";
      case "aprobar_tecnico": return "Aprobar — Director Técnico";
      case "devolver_tecnico": return "Devolver solicitud";
      case "aprobar": return "Aprobar solicitud";
      case "devolver": return "Devolver solicitud";
      case "contratos": return "Revisión de Contratos";
      case "adpro": return "Registrar Número Adpro";
      case "aprobar_final": return "Aprobación definitiva";
      case "reenviar": return "Reenviar solicitud";
      case "eliminar": return "Eliminar solicitud";
      default: return "";
    }
  }

  return (
    <>
      {/* Anexos por URL — CREACION_MINUTA / CONTRATOS */}
      {showAnexosUpload && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Anexos de la solicitud
            <span className="ml-1.5 text-xs font-normal text-red-500">* al menos 1 requerido</span>
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Agregue los enlaces a los documentos (OneDrive, SharePoint, Google Drive, etc.)
          </p>

          {/* Chips de enlaces */}
          {anexos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {anexos.map((a, idx) => {
                const { label, chipClass } = detectPlatform(a.url);
                return (
                  <div key={idx} className={`inline-flex items-center gap-2 border rounded-full px-3 py-1.5 ${chipClass}`}>
                    <Link2 size={13} className="shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold block leading-tight truncate max-w-[160px]">{a.nombre}</span>
                      <span className="text-[10px] opacity-60 leading-tight">{label}</span>
                    </div>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="shrink-0 opacity-60 hover:opacity-100" title="Abrir enlace">
                      <ExternalLink size={12} />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeAnexo(idx)}
                      className="shrink-0 opacity-40 hover:opacity-80 hover:text-red-600 ml-0.5"
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Formulario agregar URL */}
          <div className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold text-blue-700 mb-3">Agregar enlace</p>
            <div className="flex flex-col gap-2">
              <div>
                <input
                  type="text"
                  value={nombreInput}
                  onChange={e => { setNombreInput(e.target.value); setNombreError(""); }}
                  placeholder="Nombre del documento *"
                  className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                {nombreError && <p className="text-[11px] text-red-500 mt-0.5">{nombreError}</p>}
              </div>
              <div>
                <input
                  type="url"
                  value={urlInput}
                  onChange={e => { setUrlInput(e.target.value); setUrlError(""); }}
                  placeholder="https://empresa.sharepoint.com/... *"
                  className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                {urlError && <p className="text-[11px] text-red-500 mt-0.5">{urlError}</p>}
              </div>
              <Button
                onClick={handleAddUrl}
                disabled={savingAnexo}
                variant="secondary"
                className="w-full justify-center"
              >
                {savingAnexo ? <Spinner size="sm" /> : <Link2 size={14} />}
                {savingAnexo ? "Guardando…" : "Agregar enlace"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Acciones disponibles</h3>
        <div className="flex flex-wrap gap-3">

          {canEnviar && (
            <Button
              onClick={() => openModal("enviar")}
              disabled={loading}
            >
              <Send size={15} />
              Enviar Solicitud
            </Button>
          )}

          {canAprobarDirectorTecnico && (
            <Button
              variant="primary"
              onClick={() => openModal("aprobar_tecnico")}
              disabled={loading}
            >
              <CheckCircle size={15} />
              Aprobar — Director Técnico
            </Button>
          )}

          {canDevolverTecnico && (
            <Button
              variant="danger"
              onClick={() => openModal("devolver_tecnico")}
              disabled={loading}
            >
              <RotateCcw size={15} />
              Devolver
            </Button>
          )}

          {canAprobarDirector && (
            <Button
              variant="primary"
              onClick={() => openModal("aprobar")}
              disabled={loading}
            >
              <CheckCircle size={15} />
              Aprobar
            </Button>
          )}

          {canDevolver && (
            <Button
              variant="danger"
              onClick={() => openModal("devolver")}
              disabled={loading}
            >
              <RotateCcw size={15} />
              Devolver
            </Button>
          )}

          {canContratosAction && (
            <Button
              variant="primary"
              onClick={() => openModal("contratos")}
              disabled={loading}
            >
              <ClipboardCheck size={15} />
              Revisar documentación
            </Button>
          )}

          {showAnexosUpload && (
            <div title={anexos.length === 0 ? "Adjunte al menos un documento primero" : undefined}>
              <Button
                variant="primary"
                onClick={() => executeAction("AVANZAR_CONTRATOS")}
                loading={loading}
                disabled={anexos.length === 0}
              >
                <ChevronRight size={15} />
                Pasar a Controles
              </Button>
            </div>
          )}

          {canRegistrarAdpro && (
            <Button
              variant="primary"
              onClick={() => openModal("adpro")}
              disabled={loading}
            >
              <Hash size={15} />
              Registrar Número Adpro
            </Button>
          )}

          {canAprobarFinal && (
            <Button
              variant="primary"
              onClick={() => openModal("aprobar_final")}
              disabled={loading}
            >
              <ThumbsUp size={15} />
              Aprobar Definitivamente
            </Button>
          )}

          {canReenviar && (
            <Button
              variant="primary"
              onClick={() => openModal("reenviar")}
              disabled={loading}
            >
              <Send size={15} />
              Reenviar
            </Button>
          )}

          {canEdit && (
            <Link
              href={`/solicitudes/${solicitud.id}/editar`}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <PenLine size={15} />
              Editar Solicitud
            </Link>
          )}

          {isAdmin && (
            <Button
              variant="danger"
              onClick={() => openModal("eliminar")}
              disabled={loading}
            >
              <Trash2 size={15} />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={getModalTitle()}
        size="md"
      >
        <div className="space-y-4">
          {/* Enviar */}
          {modalType === "enviar" && (
            <p className="text-sm text-gray-600">
              ¿Confirmas que deseas enviar la solicitud{" "}
              <strong>{solicitud.consecutivo}</strong> para aprobación del director?
            </p>
          )}

          {/* Aprobar Director Técnico */}
          {modalType === "aprobar_tecnico" && (
            <p className="text-sm text-gray-600">
              ¿Confirmas la aprobación de la solicitud{" "}
              <strong>{solicitud.consecutivo}</strong> como Director Técnico?
              Pasará al Director de Proyecto para su aprobación.
            </p>
          )}

          {/* Devolver desde Director Técnico */}
          {modalType === "devolver_tecnico" && (
            <>
              <p className="text-sm text-gray-600">
                Indica el motivo por el que devuelves esta solicitud. El solicitante
                recibirá esta nota.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nota <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={4}
                  placeholder="Escribe el motivo de la devolución..."
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                    focus:border-blue-500 resize-none"
                />
              </div>
            </>
          )}

          {/* Aprobar director */}
          {modalType === "aprobar" && (
            <p className="text-sm text-gray-600">
              ¿Confirmas la aprobación de la solicitud{" "}
              <strong>{solicitud.consecutivo}</strong>? Pasará a Contratos para su trámite.
            </p>
          )}

          {/* Devolver */}
          {modalType === "devolver" && (
            <>
              <p className="text-sm text-gray-600">
                Indica el motivo por el que devuelves esta solicitud. El solicitante
                recibirá esta nota.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nota <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={4}
                  placeholder="Escribe el motivo de la devolución..."
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                    focus:border-blue-500 resize-none"
                />
              </div>
            </>
          )}

          {/* Contratos */}
          {modalType === "contratos" && (
            <>
              <p className="text-sm text-gray-600">
                Selecciona el resultado de la revisión de la documentación:
              </p>
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="contratosOpcion"
                    value="OK"
                    checked={contratosOpcion === "OK"}
                    onChange={() => setContratosOpcion("OK")}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      OK — Documentación Completa
                    </p>
                    <p className="text-xs text-gray-500">
                      La documentación está completa y se puede proceder a crear la minuta.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="contratosOpcion"
                    value="REVISAR"
                    checked={contratosOpcion === "REVISAR"}
                    onChange={() => setContratosOpcion("REVISAR")}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Se Debe Revisar
                    </p>
                    <p className="text-xs text-gray-500">
                      Hay observaciones que el solicitante debe atender.
                    </p>
                  </div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nota{contratosOpcion === "REVISAR" && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <textarea
                  value={notaContratos}
                  onChange={(e) => setNotaContratos(e.target.value)}
                  rows={3}
                  placeholder={
                    contratosOpcion === "REVISAR"
                      ? "Describe qué debe revisarse..."
                      : "Observaciones opcionales..."
                  }
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                    focus:border-blue-500 resize-none"
                />
              </div>
            </>
          )}

          {/* Adpro */}
          {modalType === "adpro" && (
            <>
              <p className="text-sm text-gray-600">
                Ingresa el número de contrato Adpro asignado a esta solicitud.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número Adpro <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={adproNum}
                  onChange={(e) => setAdproNum(e.target.value)}
                  placeholder="Ej. ADPRO-2024-001"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                    focus:border-blue-500"
                />
              </div>
            </>
          )}

          {/* Aprobar final */}
          {modalType === "aprobar_final" && (
            <p className="text-sm text-gray-600">
              ¿Confirmas la aprobación definitiva de la solicitud{" "}
              <strong>{solicitud.consecutivo}</strong>? El estado cambiará a{" "}
              <strong>Completada</strong>.
            </p>
          )}

          {/* Reenviar */}
          {modalType === "reenviar" && (
            <p className="text-sm text-gray-600">
              ¿Confirmas que deseas reenviar la solicitud{" "}
              <strong>{solicitud.consecutivo}</strong> para su aprobación?
            </p>
          )}

          {/* Eliminar */}
          {modalType === "eliminar" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Estás a punto de eliminar permanentemente la solicitud{" "}
                <strong className="font-mono">{solicitud.consecutivo}</strong>.
                Esta acción no se puede deshacer.
              </p>
              {solicitud.tieneOtrosis && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm font-semibold text-red-700">
                    Esta solicitud tiene otrosís vinculados
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Todos los otrosís asociados también serán eliminados permanentemente.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button
              variant="secondary"
              onClick={closeModal}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant={modalType === "devolver" || modalType === "devolver_tecnico" || modalType === "eliminar" ? "danger" : "primary"}
              onClick={handleModalConfirm}
              loading={loading}
            >
              {modalType === "enviar" && "Enviar"}
              {modalType === "aprobar_tecnico" && "Aprobar"}
              {modalType === "devolver_tecnico" && "Devolver"}
              {modalType === "aprobar" && "Aprobar"}
              {modalType === "devolver" && "Devolver"}
              {modalType === "contratos" && (contratosOpcion === "OK" ? "Confirmar OK" : "Enviar a Revisión")}
              {modalType === "adpro" && "Registrar"}
              {modalType === "aprobar_final" && "Aprobar Definitivamente"}
              {modalType === "reenviar" && "Reenviar"}
              {modalType === "eliminar" && "Eliminar permanentemente"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
