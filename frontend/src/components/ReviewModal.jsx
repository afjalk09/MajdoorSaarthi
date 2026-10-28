import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import api from '@/services/api';
import { showSuccess, showError } from '@/lib/toast';

/**
 * Star-rating + comment dialog for reviewing the other party on a job.
 *
 * Default usage: self-contained (internal `open` state + DialogTrigger).
 * Auto-open usage (job just completed via payment confirmation): pass
 * `open` + `onOpenChange` and render your own triggerless usage — the parent
 * decides when it pops up.
 */
export default function ReviewModal({ jobId, revieweeId, revieweeName, onReviewSubmitted, open: openProp, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp !== undefined ? openProp : internalOpen;
  const setOpen = (v) => {
    if (openProp === undefined) setInternalOpen(v);
    if (onOpenChange) onOpenChange(v);
  };
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      showError('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      await api.post('/reviews', {
        job_id: jobId,
        reviewee_id: revieweeId,
        rating,
        comment
      });
      setOpen(false);
      setRating(0);
      setComment('');
      if (onReviewSubmitted) onReviewSubmitted();
      showSuccess('Review submitted successfully');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Star className="h-4 w-4 mr-1" />
          Review
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review {revieweeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Rating</Label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'Click to rate'}
            </p>
          </div>
          <div>
            <Label>Comment (optional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience working with this person..."
              rows={4}
            />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
