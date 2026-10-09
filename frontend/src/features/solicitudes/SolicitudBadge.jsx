import { Badge } from '../../components/ui/Badge.jsx';
import { ESTADO_LABELS, ESTADO_BADGE_VARIANT } from '../../utils/solicitudes.js';

export function SolicitudBadge({ estado }) {
  return (
    <Badge variant={ESTADO_BADGE_VARIANT[estado] ?? 'neutral'} dot>
      {ESTADO_LABELS[estado] ?? estado}
    </Badge>
  );
}
