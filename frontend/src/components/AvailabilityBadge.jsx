import { Badge } from '@/components/ui/badge';
import { AVAILABILITY_META, availabilityLabel } from '@/lib/worker';

/** The worker's current availability — the worker analogue of JobStatusBadge. */
const AvailabilityBadge = ({ availability, className = '' }) => {
  const meta = AVAILABILITY_META[availability];

  return (
    <Badge
      variant="outline"
      className={`font-medium ${meta?.className || ''} ${className}`}
    >
      {availabilityLabel(availability)}
    </Badge>
  );
};

export default AvailabilityBadge;
