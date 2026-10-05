import RoleChip from '@/components/RoleChip';

/**
 * A worker's trade roles as a row of chips.
 *
 * A worker lists flat role names (`roles: string[]`), whereas a job lists role
 * objects with fill counts — so this renders straight through RoleChip with no
 * `count`, and JobRoleChips handles the counted variant.
 */
const WorkerRoleChips = ({ roles, variant = 'chip', showImage = false, limit, className = '' }) => {
  const list = roles || [];
  const visible = limit ? list.slice(0, limit) : list;
  const overflow = limit && list.length > limit ? list.length - limit : 0;

  if (list.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {visible.map((role, i) => (
        <RoleChip key={`${role}-${i}`} roleName={role} variant={variant} showImage={showImage} />
      ))}

      {overflow > 0 && (
        <span className="px-1.5 py-0.5 rounded-md bg-warm-100 text-warm-600 text-[10px] font-medium">
          +{overflow} more
        </span>
      )}
    </div>
  );
};

export default WorkerRoleChips;
