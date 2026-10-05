import { Badge } from '@/components/ui/badge';
import { getRoleImage } from '@/lib/roleImages';

/**
 * A single trade role as a chip, with an optional round role image — the atom
 * shared by a job's role requirements (JobRoleChips) and a worker's trade list
 * (WorkerRoleChips), which previously each hand-rolled their own version of it.
 *
 * `count` renders the trailing "filled/total" for a job role; omit it for a
 * worker, who has no per-role quota.
 *
 * `remainingCapacity` is the offer-aware free-seat count the backend derives
 * from real applications. It only drives the "(filled)" marker; when it is
 * absent we fall back to `total - filledCount`.
 */
const RoleChip = ({
  roleName,
  variant = 'chip',
  showImage = false,
  count = null,
  filledCount = 0,
  total = null,
  remainingCapacity = null,
  className = ''
}) => {
  const label = roleName || 'Unspecified';

  if (variant === 'chip') {
    return (
      <span className={`px-1.5 py-0.5 rounded-md bg-saffron-50 text-saffron-600 text-[10px] font-medium ${className}`}>
        {label}
        {count !== null && (
          <span className="opacity-70"> · {filledCount || 0}/{count}</span>
        )}
      </span>
    );
  }

  const remaining = total === null
    ? null
    : (remainingCapacity ?? total - (filledCount || 0));

  return (
    <Badge variant="outline" className={className}>
      {showImage && (
        <img
          src={getRoleImage(label)}
          alt={label}
          className="w-3.5 h-3.5 rounded-full object-cover mr-1"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      {label}
      {count !== null && `: ${filledCount || 0}/${count}`}
      {remaining !== null && remaining <= 0 && <span className="ml-1 opacity-70">(filled)</span>}
    </Badge>
  );
};

export default RoleChip;
