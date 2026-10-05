import { Badge } from '@/components/ui/badge';
import { JOB_STATUS_META, jobStatusLabel } from '@/lib/job';

/**
 * A job's lifecycle status. Single source of truth for the colours, so the
 * worker job cards, the details dialog and the tracking page all agree.
 */
const JobStatusBadge = ({ status, className = '' }) => {
  const meta = JOB_STATUS_META[status];

  return (
    <Badge
      className={`${meta?.className || ''} ${className}`}
      variant={status === 'CANCELLED' ? 'destructive' : 'default'}
    >
      {jobStatusLabel(status)}
    </Badge>
  );
};

export default JobStatusBadge;
