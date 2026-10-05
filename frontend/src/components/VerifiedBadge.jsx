import { BadgeCheck } from 'lucide-react';

/**
 * The verified marker for a worker or employer. Employers only become
 * `isVerified` once PAN + Aadhaar (and an address proof, for CONTRACTOR /
 * COMPANY) have been approved by an admin.
 */
const VerifiedBadge = ({ verified, label = 'Verified', className = '' }) => {
  if (!verified) return null;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium text-primary ${className}`}>
      <BadgeCheck className="h-3.5 w-3.5" />
      {label}
    </span>
  );
};

export default VerifiedBadge;
