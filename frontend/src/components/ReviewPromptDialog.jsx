import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DISMISS_KEY = 'review_prompt_dismissed';

function getDismissedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function markDismissed(jobId) {
  const set = getDismissedSet();
  set.add(jobId);
  localStorage.setItem(DISMISS_KEY, JSON.stringify([...set]));
}

export default function ReviewPromptDialog({ pendingJobs }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!pendingJobs || pendingJobs.length === 0) return;
    const undismissed = pendingJobs.filter(j => !getDismissedSet().has(j.id));
    if (undismissed.length > 0) {
      setOpen(true);
    }
  }, [pendingJobs]);

  const handleDismiss = () => {
    pendingJobs.forEach(j => markDismissed(j.id));
    setOpen(false);
  };

  const handleReview = (jobId) => {
    handleDismiss();
    navigate(`/jobs/${jobId}/track`);
  };

  if (!pendingJobs || pendingJobs.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            Review Your Experience
          </DialogTitle>
          <DialogDescription>
            You have {pendingJobs.length} completed job{pendingJobs.length > 1 ? 's' : ''} waiting for your review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {pendingJobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between border rounded-lg p-3"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{job.title}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {job.locationText || 'No location'}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 ml-3"
                onClick={() => handleReview(job.id)}
              >
                <Star className="h-4 w-4 mr-1" />
                Review
              </Button>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="w-full mt-2" onClick={handleDismiss}>
          Skip for now
        </Button>
      </DialogContent>
    </Dialog>
  );
}
