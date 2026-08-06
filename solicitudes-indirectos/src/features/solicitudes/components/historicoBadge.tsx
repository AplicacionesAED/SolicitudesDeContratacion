import { History } from "lucide-react";

interface HistoricoBadgeProps {
  numeroOtrosi?: number | null;
  className?: string;
}

export function HistoricoBadge({ numeroOtrosi, className = "" }: HistoricoBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 justify-center
        rounded-full px-2.5 py-0.5
        text-xs font-medium leading-tight whitespace-nowrap
        bg-amber-50 text-amber-700 border border-amber-200
        ${className}
      `}
    >
      <History size={11} className="shrink-0" />
      {numeroOtrosi ? `Otrosí histórico #${numeroOtrosi}` : "Importado"}
    </span>
  );
}
