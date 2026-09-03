import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import MilestoneCard from '@/components/MilestoneCard';
import DisputeForm from '@/components/DisputeForm';
import ReviewModal from '@/components/ReviewModal';
import api from '@/services/api';
import { ArrowLeft, MapPin, IndianRupee, Calendar, Users } from 'lucide-react';

export default function JobTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const isEmployer = user.role === 'EMPLOYER';

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const res = await api.get(`/jobs/${id}`);
      setJob(res.data.data);
    } catch (err) {
      console.error('Failed to fetch job');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!confirm('Mark this job as completed? This will notify all workers.')) return;

    setCompleting(true);
    try {
      await api.put(`/jobs/${id}/complete`);
      fetchJob();
      alert('Job marked as completed');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete job');
    } finally {
      setCompleting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN': return <Badge className="bg-blue-500">Open</Badge>;
      case 'IN_PROGRESS': return <Badge className="bg-yellow-500">In Progress</Badge>;
      case 'COMPLETED': return <Badge className="bg-green-500">Completed</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Job not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">{job.title}</CardTitle>
                {job.description && (
                  <p className="text-muted-foreground mt-1">{job.description}</p>
                )}
              </div>
              {getStatusBadge(job.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {job.locationText && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{job.locationText}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                <span>₹{job.wageAmount}/{job.wageType?.toLowerCase()}</span>
              </div>
              {job.durationDays && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{job.durationDays} days</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{job.workersNeeded} workers needed</span>
              </div>
            </div>

            {job.jobRoles && job.jobRoles.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-sm mb-2">Roles</h4>
                <div className="flex flex-wrap gap-2">
                  {job.jobRoles.map(role => (
                    <Badge key={role.id} variant="outline">
                      {role.roleName}: {role.filledCount}/{role.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <MilestoneCard jobId={id} isEmployer={isEmployer} />

          {job.status === 'IN_PROGRESS' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {job.status === 'IN_PROGRESS' && (
                    <Button
                      onClick={handleCompleteJob}
                      disabled={completing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {completing ? 'Completing...' : 'Mark as Completed'}
                    </Button>
                  )}
                  <DisputeForm jobId={id} onDisputeRaised={fetchJob} />
                </div>
              </CardContent>
            </Card>
          )}

          {job.status === 'COMPLETED' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review & Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This job is completed. Leave a review to build trust.
                </p>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard to Leave Review
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
