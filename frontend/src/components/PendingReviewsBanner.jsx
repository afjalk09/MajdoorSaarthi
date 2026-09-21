import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PendingReviewsBanner({ pendingJobs }) {
  const navigate = useNavigate();

  if (!pendingJobs || pendingJobs.length === 0) return null;

  return (
    <Card className="border-amber-400 bg-amber-50 dark:bg-amber-950/20">
      <CardContent className="py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Star className="h-5 w-5 text-amber-600 fill-amber-600 shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {pendingJobs.length} pending review{pendingJobs.length > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Rate your experience to unlock job details
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-amber-600 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
          onClick={() => navigate(`/jobs/${pendingJobs[0].id}/track`)}
        >
          Review Now
        </Button>
      </CardContent>
    </Card>
  );
}
