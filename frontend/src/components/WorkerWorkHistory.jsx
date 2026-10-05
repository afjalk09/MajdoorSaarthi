import { MapPin, IndianRupee } from 'lucide-react';
import { formatDateTime } from '@/lib/format';

/**
 * A worker's finished jobs: what they did, for whom, for what pay.
 *
 * Derived on read by the backend from COMPLETED JobApplication rows — nothing in
 * the schema aggregates it, and a worker may have been one of several trades on
 * a job, so each entry carries the role they filled.
 */
const WorkerWorkHistory = ({ history = [] }) => {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No completed jobs yet — this worker has not finished an assignment through the platform.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {history.map((entry, i) => (
        <div key={`${entry.jobId}-${i}`} className="rounded-lg border border-warm-200 bg-warm-50/50 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-medium min-w-0 truncate">{entry.jobTitle || 'Untitled job'}</p>
            {entry.roleName && (
              <span className="shrink-0 rounded-md bg-saffron-50 px-2 py-0.5 text-[10px] font-medium text-saffron-600">
                {entry.roleName}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {entry.employerName && <span>Hired by {entry.employerName}</span>}
            {entry.locationText && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} className="text-saffron-500" />
                {entry.locationText}
              </span>
            )}
            {entry.wageAmount !== null && entry.wageAmount !== undefined && (
              <span className="inline-flex items-center gap-1">
                <IndianRupee size={11} className="text-saffron-500" />
                {entry.wageAmount}/{String(entry.wageType || '').toLowerCase()}
              </span>
            )}
          </div>

          <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(entry.appliedAt)}</p>
        </div>
      ))}
    </div>
  );
};

export default WorkerWorkHistory;
