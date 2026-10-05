import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/LoadingSkeleton';
import JobBanner from '@/components/JobBanner';
import JobStatusBadge from '@/components/JobStatusBadge';
import JobRoleChips from '@/components/JobRoleChips';
import JobFacts from '@/components/JobFacts';
import EmployerCard from '@/components/EmployerCard';
import api from '@/services/api';
import { applicationStatusLabel } from '@/lib/job';

/**
 * Full work + employer details for one job, in a modal.
 *
 * Owns only the fetch and the open/close plumbing — the presentation is
 * entirely composed of the shared job components, so this view and the
 * tracking page can never drift apart.
 *
 * Fetches GET /api/worker/jobs/:id, the worker-safe projection of a job. Pass
 * `application` (a JobApplication) to also show where the worker stands on it.
 */
const JobDetailsDialog = ({ jobId, open, onOpenChange, application, footer }) => {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !jobId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    api.get(`/worker/jobs/${jobId}`)
      .then((res) => { if (!cancelled) setJob(res.data.data); })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load job details');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [open, jobId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">
            {job?.title || 'Job details'}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-3 py-2">
            <Skeleton className="h-32 w-full rounded-xl" />
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

        {!loading && !error && job && (
          <div className="space-y-5">
            <JobBanner job={job} className="rounded-xl" />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <JobStatusBadge status={job.status} />
                {application && (
                  <Badge variant="secondary">You: {applicationStatusLabel(application.status)}</Badge>
                )}
              </div>
              {application?.jobRole?.roleName && (
                <span className="text-xs text-muted-foreground">
                  Applied for: {application.jobRole.roleName}
                </span>
              )}
            </div>

            <JobFacts job={job} showPosted />

            {job.description && (
              <div>
                <h4 className="mb-1.5 text-sm font-medium">About this work</h4>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{job.description}</p>
              </div>
            )}

            {job.jobRoles?.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">Roles needed</h4>
                <JobRoleChips jobRoles={job.jobRoles} variant="badge" showImage showCount />
              </div>
            )}

            <div>
              <h4 className="mb-2 text-sm font-medium">Employer</h4>
              <EmployerCard
                employer={job.employer}
                note="Identity documents are verified by our admin team before a job goes live. Direct contact details are shared once you are hired."
              />
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

export default JobDetailsDialog;
