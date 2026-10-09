// Puerto de historicoBadge.tsx.
import { History } from 'lucide-react';
import { Badge } from '../../components/ui/Badge.jsx';

export function HistoricoBadge({ numeroOtrosi }) {
  return (
    <Badge variant="warning">
      <History size={11} strokeWidth={1.75} aria-hidden="true" />
      {numeroOtrosi ? `Otrosí histórico #${numeroOtrosi}` : 'Importado'}
    </Badge>
  );
}
