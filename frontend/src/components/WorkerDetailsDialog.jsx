import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/LoadingSkeleton';
import WorkerBanner from '@/components/WorkerBanner';
import AvailabilityBadge from '@/components/AvailabilityBadge';
import WorkerRoleChips from '@/components/WorkerRoleChips';
import WorkerFacts from '@/components/WorkerFacts';
import WorkerReputation from '@/components/WorkerReputation';
import WorkerWorkHistory from '@/components/WorkerWorkHistory';
import VerifiedBadge from '@/components/VerifiedBadge';
import api from '@/services/api';
import { applicationStatusLabelForEmployer } from '@/lib/job';
import { workStatusLabel } from '@/lib/worker';

/**
 * Full profile, reputation and work history for one worker, in a modal — the
 * employer-side counterpart to JobDetailsDialog.
 *
 * Owns only the fetch and the open/close plumbing; the presentation is entirely
 * composed of the shared worker components. Fetches
 * GET /api/employer/workers/:id, which returns the public worker projection plus
 * the derived `reputation`, `reviews` and `workHistory` — so one call serves
 * every surface that opens it, whether the caller already had snake_case match
 * data or a full camelCase worker row.
 *
 * Pass `application` (a JobApplication, or a hired-worker record from
 * JobTracking) to also show how this worker stands on the current job.
 */
const WorkerDetailsDialog = ({ workerId, open, onOpenChange, application, footer }) => {
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // A JobApplication carries the role as `jobRole.roleName`; a hired-worker
  // record from JobTracking carries it flat as `roleName`.
  const roleName = application?.roleName || application?.jobRole?.roleName || null;

  useEffect(() => {
    if (!open || !workerId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    api.get(`/employer/workers/${workerId}`)
      .then((res) => { if (!cancelled) setWorker(res.data.data); })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load worker details');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [open, workerId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">
            {worker?.fullName || 'Worker details'}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-3 py-2">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        )}

        {!loading && error && (
          <div className="space-y-3 py-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}

        {!loading && !error && worker && (
          <div className="space-y-5">
            <WorkerBanner worker={worker} className="rounded-xl" />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <AvailabilityBadge availability={worker.availability} />
                <VerifiedBadge verified={worker.isVerified} />
                {application && (
                  <Badge variant="secondary">
                    {applicationStatusLabelForEmployer(application.status)}
                  </Badge>
                )}
              </div>
              {roleName && (
                <span className="text-xs text-muted-foreground">
                  {application?.workStatus
                    ? `${roleName} · ${workStatusLabel(application.workStatus)}`
                    : roleName}
                </span>
              )}
            </div>

            <WorkerFacts worker={worker} />

            <div>
              <h4 className="mb-2 text-sm font-medium">Trades</h4>
              <WorkerRoleChips roles={worker.roles} variant="badge" showImage />
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium">Reputation</h4>
              <WorkerReputation reputation={worker.reputation} reviews={worker.reviews} />
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium">Work history</h4>
              <WorkerWorkHistory history={worker.workHistory} />
            </div>

            {footer && (
              <DialogFooter>
                {footer}
              </DialogFooter>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WorkerDetailsDialog;
