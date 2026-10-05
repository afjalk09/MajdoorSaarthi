import RoleChip from '@/components/RoleChip';

/**
 * The role requirements of a job, as a row of chips.
 *
 * `variant="chip"` is the dense saffron pill used on job cards;
 * `variant="badge"` is the outline badge with a round role image. Both delegate
 * the rendering of an individual role to RoleChip, which is also what a
 * worker's own trade list uses.
 *
 * `remainingCapacity` is preferred over `count - filledCount` because it is
 * derived from real applications (a pending OFFERED app does not reserve a
 * seat). `getAvailableJobs` and `GET /worker/jobs/:id` both supply it.
 */
const JobRoleChips = ({
  jobRoles,
  variant = 'chip',
  showImage = false,
  showCount = false,
  limit,
  className = ''
}) => {
  const roles = jobRoles || [];
  const visible = limit ? roles.slice(0, limit) : roles;
  const overflow = limit && roles.length > limit ? roles.length - limit : 0;

  if (roles.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {visible.map((role) => (
        <RoleChip
          key={role.id || role.roleName}
          roleName={role.roleName}
          variant={variant}
          showImage={showImage}
          count={showCount ? role.count : null}
          filledCount={role.filledCount || 0}
          total={role.count}
          remainingCapacity={role.remainingCapacity}
        />
      ))}

      {overflow > 0 && (
        <span className="px-1.5 py-0.5 rounded-md bg-warm-100 text-warm-600 text-[10px] font-medium">
          +{overflow} more
        </span>
      )}
    </div>
  );
};

export default JobRoleChips;
