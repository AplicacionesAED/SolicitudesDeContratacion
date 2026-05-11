import { CheckCircle2 } from "lucide-react";
import { ESTADO_LABELS, ESTADO_COLORS } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SolicitudBadgeProps {
  estado: string;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SolicitudBadge({ estado, className = "" }: SolicitudBadgeProps) {
  const label = ESTADO_LABELS[estado] ?? estado;
  const colors = ESTADO_COLORS[estado] ?? "bg-gray-100 text-gray-700";
  const isCompletada = estado === "COMPLETADA";

  return (
    <span
      className={`
        inline-flex items-center gap-1 justify-center
        rounded-full px-2.5 py-0.5
        text-xs font-medium leading-tight whitespace-nowrap
        ${colors}
        ${className}
      `}
    >
      {isCompletada && <CheckCircle2 size={11} className="shrink-0" />}
      {label}
    </span>
  );
}
