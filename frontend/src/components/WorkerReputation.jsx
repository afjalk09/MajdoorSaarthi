import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatReliability } from '@/lib/format';

const Stars = ({ rating, size = 13 }) => (
  <span className="inline-flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        className={n <= Math.round(rating) ? 'fill-gold-400 text-gold-400' : 'text-muted-foreground/30'}
      />
    ))}
  </span>
);

const COLLAPSED_COUNT = 3;

/**
 * A worker's reputation: the headline numbers an employer scans first, then the
 * reviews behind them.
 *
 * `averageRating` is computed fresh from Review rows by the backend, while
 * `reliabilityScore` is the stored dual-scale column that is also what the
 * browse and match listings sort by. Both are shown because they come from
 * different tables (see backend/src/lib/reliability.js) and can disagree.
 */
const WorkerReputation = ({ reputation, reviews = [] }) => {
  const [expanded, setExpanded] = useState(false);

  const average = Number(reputation?.averageRating) || 0;
  const total = reputation?.totalReviews ?? reviews.length;
  const visible = expanded ? reviews : reviews.slice(0, COLLAPSED_COUNT);
  const hidden = reviews.length - visible.length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {total > 0 ? (
          <>
            <span className="flex items-center gap-1.5">
              <Stars rating={average} />
              <span className="text-sm font-medium">{average.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                from {total} {total === 1 ? 'review' : 'reviews'}
              </span>
            </span>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No reviews yet — this worker has not been rated on a completed job.
          </p>
        )}

        {/* Rendered independently of the review count: the stored score can come
            from Rating rows, so it exists even for a worker with no reviews.
            Goes through formatReliability because the column is dual-scale. */}
        {formatReliability(reputation?.reliabilityScore) && (
          <span className="text-xs text-muted-foreground">
            Reliability {formatReliability(reputation.reliabilityScore)}
          </span>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="space-y-2.5">
          {visible.map((review) => (
            <div key={review.id} className="rounded-lg border border-warm-200 bg-warm-50/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars rating={review.rating} />
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(review.createdAt)}
                </span>
              </div>
              {review.comment && (
                <p className="mt-1.5 text-sm text-foreground/90">{review.comment}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {review.reviewerName}
                {review.jobTitle && <> — {review.jobTitle}</>}
              </p>
            </div>
          ))}

          {(hidden > 0 || expanded) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show fewer reviews' : `Show ${hidden} more ${hidden === 1 ? 'review' : 'reviews'}`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkerReputation;
