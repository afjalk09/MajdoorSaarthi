import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReviewModal from '@/components/ReviewModal';
import { Lock, Star } from 'lucide-react';

export default function JobReviewPanel({ job, isEmployer, onReviewSubmitted, autoOpen = 0 }) {
  // Which reviewee's modal is currently auto-opened (by index into reviewees).
  const [autoIdx, setAutoIdx] = useState(null);
  const handledTokens = useRef(new Set());

  if (job.status !== 'COMPLETED') return null;

  const hiredWorkers = job.hiredWorkers || [];
  const requiredReviews = job.requiredReviews ?? (isEmployer ? hiredWorkers.length : hiredWorkers.length > 0 ? 1 : 0);
  const reviewedCount = job.myReviews?.length || 0;
  const complete = job.reviewComplete || requiredReviews === 0;

  const reviewees = isEmployer
    ? hiredWorkers.map(w => ({ id: w.userId, name: w.fullName }))
    : (job.employer ? [{ id: job.employer.userId, name: job.employer.displayName }] : []);

  // Unrated = everyone this user still has to review (myReviews carries revieweeId).
  const ratedIds = new Set((job.myReviews || []).map(r => r.revieweeId));
  const unratedIdx = reviewees.findIndex(r => !ratedIds.has(r.id));

  // Parent bumps `autoOpen` when the job completes (payment cascade) or when a
  // completed-but-unreviewed job's page mounts — pop the first pending review.
  useEffect(() => {
    if (!autoOpen || handledTokens.current.has(autoOpen)) return;
    handledTokens.current.add(autoOpen);
    if (!complete && unratedIdx >= 0) setAutoIdx(unratedIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, complete, unratedIdx]);

  return (
    <Card className={!complete ? 'border-amber-400' : 'border-green-500'}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {complete ? <Star className="h-5 w-5 text-green-600 fill-green-600" /> : <Lock className="h-5 w-5 text-amber-600" />}
          {complete ? 'Reviews Complete' : 'Review Required'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {complete ? (
          <p className="text-sm text-muted-foreground">
            You have rated {reviewedCount} of {requiredReviews} required. Details are unlocked.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Please rate {reviewees.length === 0 ? 'the other party' : reviewees.map(r => r.name).join(', ')} to unlock
              the job details.
              {requiredReviews > 1 && (
                <Badge variant="secondary" className="ml-2">
                  {reviewedCount}/{requiredReviews} rated
                </Badge>
              )}
            </p>
            {reviewees.map((reviewee, i) => (
              <div key={reviewee.id} className="flex items-center justify-between border rounded-lg p-3 mb-2">
                <div>
                  <p className="font-medium">{reviewee.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isEmployer ? 'Worker' : 'Employer'}
                  </p>
                </div>
                <ReviewModal
                  jobId={job.id}
                  revieweeId={reviewee.id}
                  revieweeName={reviewee.name}
                  open={autoIdx === i}
                  onOpenChange={(v) => setAutoIdx(v ? i : null)}
                  onReviewSubmitted={() => {
                    setAutoIdx(null);
                    if (onReviewSubmitted) onReviewSubmitted();
                  }}
                />
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
