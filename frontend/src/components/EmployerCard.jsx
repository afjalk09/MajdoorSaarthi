import { MapPin, User, Briefcase } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import { initialsOf } from '@/lib/format';
import { employerTypeLabel } from '@/lib/docTypes';

/**
 * Public-safe view of the employer behind a job — the `employer` object as
 * returned by the job endpoints (see backend/src/lib/publicEmployer.js for
 * which fields are exposed and which are deliberately withheld).
 *
 * Purely presentational: takes the employer as a prop so it can be rendered
 * from a job card, the details dialog or the tracking page alike. Employers
 * have no photo field, hence the initials avatar.
 */
const EmployerCard = ({ employer, note }) => {
  if (!employer) {
    return (
      <p className="text-sm text-muted-foreground">
        Employer details are not available for this job.
      </p>
    );
  }

  const name = employer.displayName || 'Unnamed employer';

  return (
    <div className="flex items-start gap-3 rounded-lg border border-warm-200 bg-warm-50/50 p-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-saffron-100 to-earth-100 font-display font-bold text-saffron-600">
        {initialsOf(name, 'E')}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate font-medium">{name}</p>
          <VerifiedBadge verified={employer.isVerified} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {employer.employerType && (
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {employerTypeLabel(employer.employerType)}
            </span>
          )}

          {employer.locationText && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {employer.locationText}
            </span>
          )}

          {employer.contactPerson && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {employer.contactPerson}
            </span>
          )}
        </div>

        {note && <p className="pt-1 text-xs text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
};

export default EmployerCard;
