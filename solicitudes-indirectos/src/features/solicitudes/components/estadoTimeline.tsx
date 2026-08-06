import {
  Send,
  CheckCircle,
  FileText,
  PenLine,
  ClipboardCheck,
  ThumbsUp,
  Star,
  RotateCcw,
  Eye,
  UserCheck,
  Minus,
  History,
} from "lucide-react";
import { ESTADO_LABELS, formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistorialEntry {
  accion: string;
  fecha: string | Date;
  usuario?: { nombre: string };
}

interface EstadoTimelineProps {
  estadoActual: string;
  historial?: HistorialEntry[];
  importadoHistorico?: boolean;
  numeroOtrosi?: number | null;
}

// ─── Workflow definition ──────────────────────────────────────────────────────

interface StepDef {
  label: string;
  icon: React.ElementType;
  optional?: boolean;
  /** Acción en el historial que marca este paso como completado. null = derivado del estado. */
  completionAction: string | null;
  /** Estados en los que este paso está "en curso". */
  activeStates: string[];
  /** Si es true, al reenviar la solicitud este paso se evalúa sólo en el ciclo actual. */
  resettable?: boolean;
}

const WORKFLOW_STEPS: StepDef[] = [
  {
    label: "Solicitud Enviada",
    icon: Send,
    completionAction: "ENVIAR",
    activeStates: [],
  },
  {
    label: "Director Técnico",
    icon: UserCheck,
    optional: true,
    completionAction: "APROBAR_DIRECTOR_TECNICO",
    activeStates: ["PENDIENTE_DIRECTOR_TECNICO"],
  },
  {
    label: "Director de Proyecto",
    icon: CheckCircle,
    completionAction: "APROBAR_DIRECTOR",
    activeStates: ["ENVIADA"],
    resettable: true,
  },
  {
    label: "Trámite Contratos",
    icon: FileText,
    completionAction: "TRAMITAR_OK",
    activeStates: ["EN_TRAMITE_CONTRATOS", "APROBADA_DIRECTOR"],
    resettable: true,
  },
  {
    label: "Creación de Minuta",
    icon: PenLine,
    completionAction: "AVANZAR_CONTRATOS",
    activeStates: ["CREACION_MINUTA"],
    resettable: true,
  },
  {
    label: "N° Adpro / Controles",
    icon: ClipboardCheck,
    completionAction: "REGISTRAR_ADPRO",
    activeStates: ["EN_CONTROLES"],
    resettable: true,
  },
  {
    label: "Aprobación Final",
    icon: ThumbsUp,
    completionAction: "APROBAR_FINAL",
    activeStates: ["APROBACION_FINAL"],
    resettable: true,
  },
  {
    label: "Completada",
    icon: Star,
    completionAction: null,
    activeStates: ["COMPLETADA"],
  },
];

const SIDE_STATES = ["DEVUELTA", "EN_REVISION", "BORRADOR"];

// ─── Component ────────────────────────────────────────────────────────────────

export function EstadoTimeline({
  estadoActual,
  historial = [],
  importadoHistorico = false,
  numeroOtrosi,
}: EstadoTimelineProps) {
  if (importadoHistorico) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Progreso del flujo</h3>
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">
          <History size={14} />
          <span>
            {numeroOtrosi
              ? `Otrosí histórico #${numeroOtrosi} — importado sin flujo de aprobación.`
              : "Contrato histórico — importado sin flujo de aprobación."}
          </span>
        </div>
      </div>
    );
  }

  const isSideState = SIDE_STATES.includes(estadoActual);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-5">
        Progreso del flujo
      </h3>

      {/* Side states banner */}
      {isSideState && (
        <div
          className={`
            mb-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
            ${estadoActual === "DEVUELTA"
              ? "bg-red-50 border border-red-200 text-red-700"
              : estadoActual === "EN_REVISION"
              ? "bg-yellow-50 border border-yellow-200 text-yellow-700"
              : "bg-gray-50 border border-gray-200 text-gray-600"
            }
          `}
        >
          {estadoActual === "DEVUELTA" && <RotateCcw size={14} />}
          {estadoActual === "EN_REVISION" && <Eye size={14} />}
          <span>
            Estado actual:{" "}
            <strong>{ESTADO_LABELS[estadoActual] ?? estadoActual}</strong>
          </span>
        </div>
      )}

      {/* Main stepper */}
      <div className="relative">
        {/* Connector line */}
        <div
          className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200"
          aria-hidden="true"
        />

        <ol className="relative flex justify-between">
          {(() => {
            // Index of the last ENVIAR or REENVIAR = start of current cycle
            const lastCycleStartIdx = historial.reduce(
              (best, h, i) =>
                h.accion === "ENVIAR" || h.accion === "REENVIAR" ? i : best,
              -1
            );

            return WORKFLOW_STEPS.map((step) => {
            const Icon = step.icon;

            // For resettable steps, only look at historial after the last send/resend
            const searchSlice =
              step.resettable && lastCycleStartIdx >= 0
                ? historial.slice(lastCycleStartIdx + 1)
                : historial;

            // Find the historial entry that marks this step as completed
            const histEntry = step.completionAction
              ? searchSlice.find((h) => h.accion === step.completionAction)
              : null;

            // Steps without completionAction (Completada) derive completion from estado
            const isCompleted =
              step.completionAction === null
                ? step.activeStates.includes(estadoActual)
                : !!histEntry;

            const isCurrent =
              !isCompleted && step.activeStates.includes(estadoActual);

            // Optional step not involved in this solicitud's workflow
            const isSkipped = !!step.optional && !isCompleted && !isCurrent;

            const isCompletadaStep = step.activeStates.includes("COMPLETADA");

            const circleClass = isSkipped
              ? "bg-gray-100 border-gray-200 text-gray-300"
              : isCompleted
              ? isCompletadaStep
                ? "bg-green-600 border-green-600 text-white"
                : "bg-blue-600 border-blue-600 text-white"
              : isCurrent
              ? "bg-white border-blue-600 text-blue-600"
              : "bg-white border-gray-300 text-gray-400";

            const labelClass = isSkipped
              ? "text-gray-300"
              : isCurrent
              ? "font-semibold text-blue-700"
              : isCompleted
              ? isCompletadaStep
                ? "font-medium text-green-700"
                : "font-medium text-gray-700"
              : "text-gray-400";

            const date = histEntry ? formatDate(histEntry.fecha) : null;
            const userName = histEntry?.usuario?.nombre ?? null;

            return (
              <li
                key={step.label}
                className="flex flex-col items-center gap-1 flex-1"
              >
                {/* Circle */}
                <div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 shrink-0 transition-colors ${circleClass}`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isSkipped ? <Minus size={14} /> : <Icon size={16} />}
                </div>

                {/* Label */}
                <span
                  className={`text-center text-xs leading-tight max-w-18 ${labelClass}`}
                >
                  {step.label}
                </span>

                {/* Date */}
                {date && (
                  <span className="text-[10px] text-gray-400 text-center leading-tight">
                    {date}
                  </span>
                )}

                {/* User who executed this step */}
                {userName && (
                  <span className="text-[10px] text-gray-500 text-center leading-tight font-medium max-w-18 truncate">
                    {userName}
                  </span>
                )}
              </li>
            );
          });
          })()}
        </ol>
      </div>
    </div>
  );
}
