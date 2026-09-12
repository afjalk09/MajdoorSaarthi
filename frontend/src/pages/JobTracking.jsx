import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import MilestoneCard from '@/components/MilestoneCard';
import DisputeForm from '@/components/DisputeForm';
import JobReviewPanel from '@/components/JobReviewPanel';
import api from '@/services/api';
import { showSuccess, showError } from '@/lib/toast';
import { ArrowLeft, MapPin, IndianRupee, Calendar, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const WORK_STATUS_LABELS = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETION_REQUESTED: 'Completion Requested',
  COMPLETED: 'Completed'
};

export default function JobTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [workDrafts, setWorkDrafts] = useState({});
  const [savingWork, setSavingWork] = useState({});

  const isEmployer = user.role === 'EMPLOYER';

  const updateWorkDraft = (workerId, field, value) => {
    setWorkDrafts(prev => ({ ...prev, [workerId]: { ...(prev[workerId] || {}), [field]: value } }));
  };

  const saveEmployerWorkStatus = async (workerId) => {
    const draft = workDrafts[workerId] || {};
    setSavingWork(prev => ({ ...prev, [workerId]: true }));
    try {
      await api.put(`/jobs/${id}/workers/${workerId}/status`, {
        workStatus: draft.workStatus,
        workNote: draft.workNote
      });
      fetchJob();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update worker status');
    } finally {
      setSavingWork(prev => ({ ...prev, [workerId]: false }));
    }
  };

  const acceptWorkerCompletion = async (workerId, name) => {
    if (!confirm(`Accept ${name}'s work as complete? They will be freed and marked available.`)) return;
    setSavingWork(prev => ({ ...prev, [workerId]: true }));
    try {
      await api.put(`/jobs/${id}/workers/${workerId}/status`, {
        workStatus: 'COMPLETED'
      });
      fetchJob();
      showSuccess(`${name}'s work verified and accepted. They are now available.`);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to accept worker completion');
    } finally {
      setSavingWork(prev => ({ ...prev, [workerId]: false }));
    }
  };

  const rejectWorkerCompletion = async (workerId, name) => {
    if (!confirm(`Reject ${name}'s completion request? Their status will reset to In Progress.`)) return;
    setSavingWork(prev => ({ ...prev, [workerId]: true }));
    try {
      await api.put(`/jobs/${id}/workers/${workerId}/status`, {
        workStatus: 'IN_PROGRESS'
      });
      fetchJob();
      showSuccess(`${name}'s completion request rejected — status reset to In Progress.`);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to reject worker completion');
    } finally {
      setSavingWork(prev => ({ ...prev, [workerId]: false }));
    }
  };

  const saveMyWorkStatus = async () => {
    const draft = workDrafts['me'] || {};
    setSavingWork(prev => ({ ...prev, me: true }));
    try {
      await api.put(`/worker/applications/${id}/work-status`, {
        workStatus: draft.workStatus,
        workNote: draft.workNote
      });
      fetchJob();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update work status');
    } finally {
      setSavingWork(prev => ({ ...prev, me: false }));
    }
  };

  const requestWorkCompletion = async () => {
    if (!confirm('Mark your work as complete and notify the employer for verification?')) return;
    setSavingWork(prev => ({ ...prev, me: true }));
    try {
      await api.put(`/worker/applications/${id}/work-status`, {
        workStatus: 'COMPLETION_REQUESTED'
      });
      fetchJob();
      showSuccess('Completion request sent to employer for verification.');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to request completion');
    } finally {
      setSavingWork(prev => ({ ...prev, me: false }));
    }
  };

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
      showSuccess('Job marked as completed');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to complete job');
    } finally {
      setCompleting(false);
    }
  };

  const handleCancelJob = async () => {
    if (!confirm('Cancel this job? You will become available for new jobs.')) return;
    try {
      await api.put(`/worker/jobs/${id}/cancel`);
      showSuccess('Job cancelled — you are now available.');
      fetchJob();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel job');
    }
  };

  const handleRemoveWorker = async (workerId, name) => {
    if (!confirm(`Remove ${name} from this job? They will become available again.`)) return;
    try {
      await api.post(`/jobs/${id}/remove/${workerId}`);
      showSuccess('Worker removed');
      fetchJob();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to remove worker');
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
              {(job.startDate || job.startTime) && (
                <div className="flex items-center gap-2 col-span-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {job.startDate && new Date(job.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {job.startDate && job.endDate && ` – ${new Date(job.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    {job.startDate && job.startTime && ' | '}
                    {job.startTime && `${job.startTime} – ${job.endTime || '?'}`}
                  </span>
                </div>
              )}
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
          {job.status === 'COMPLETED' && !job.reviewComplete ? (
            <JobReviewPanel
              job={job}
              isEmployer={isEmployer}
              onReviewSubmitted={fetchJob}
            />
          ) : (
            <>
              <MilestoneCard jobId={id} isEmployer={isEmployer} />

              {(job.status === 'IN_PROGRESS' || job.status === 'OPEN') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Job Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEmployer ? (
                      (job.hiredWorkers && job.hiredWorkers.length > 0) ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Hired Workers</p>
                          {job.hiredWorkers.map((w) => {
                            const draft = workDrafts[w.id] || {};
                            const isPending = w.workStatus === 'COMPLETION_REQUESTED';
                            const isCompleted = w.workStatus === 'COMPLETED';
                            return (
                              <div key={w.id} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{w.fullName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {w.skills?.length ? w.skills.join(', ') : 'No skills listed'}
                                    </p>
                                    <p className="text-xs mt-1">
                                      {WORK_STATUS_LABELS[w.workStatus] || w.workStatus}
                                      {isPending && (
                                        <Badge className="ml-2 bg-yellow-500">Awaiting Your Acceptance</Badge>
                                      )}
                                      {isCompleted && (
                                        <Badge className="ml-2 bg-green-600">Completed & Available</Badge>
                                      )}
                                    </p>
                                  </div>
                                  <Button variant="destructive" size="sm" onClick={() => handleRemoveWorker(w.id, w.fullName)}>
                                    Remove Worker
                                  </Button>
                                </div>
                                {isCompleted ? (
                                  <p className="text-sm text-muted-foreground mt-3">
                                    This worker's work has been verified and accepted — they are already freed and available for new jobs.
                                  </p>
                                ) : (
                                  <div className="mt-3 space-y-2">
                                    {isPending ? (
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          className="flex-1 bg-green-600 hover:bg-green-700"
                                          disabled={savingWork[w.id]}
                                          onClick={() => acceptWorkerCompletion(w.id, w.fullName)}
                                        >
                                          {savingWork[w.id] ? 'Saving...' : 'Accept Completion'}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex-1"
                                          disabled={savingWork[w.id]}
                                          onClick={() => rejectWorkerCompletion(w.id, w.fullName)}
                                        >
                                          Reject
                                        </Button>
                                      </div>
                                    ) : (
                                      <>
                                        <div>
                                          <Label className="text-xs">Work Status</Label>
                                          <Select
                                            value={(draft.workStatus ?? w.workStatus) || 'NOT_STARTED'}
                                            onValueChange={(v) => updateWorkDraft(w.id, 'workStatus', v)}
                                          >
                                            <SelectTrigger className="mt-1">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                              <SelectItem value="COMPLETED">Completed</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <Label className="text-xs">Note</Label>
                                          <Textarea
                                            className="mt-1"
                                            rows={2}
                                            placeholder="Progress note..."
                                            value={draft.workNote !== undefined ? draft.workNote : (w.workNote || '')}
                                            onChange={(e) => updateWorkDraft(w.id, 'workNote', e.target.value)}
                                          />
                                        </div>
                                        <Button
                                          size="sm"
                                          className="w-full"
                                          disabled={savingWork[w.id]}
                                          onClick={() => saveEmployerWorkStatus(w.id)}
                                        >
                                          {savingWork[w.id] ? 'Saving...' : 'Save Status'}
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No hired workers yet.</p>
                      )
                    ) : (
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
                        <Button variant="destructive" onClick={handleCancelJob}>
                          Cancel Job
                        </Button>
                        <DisputeForm jobId={id} onDisputeRaised={fetchJob} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!isEmployer && job.hiredWorkers && job.hiredWorkers.length > 0 && (job.status === 'OPEN' || job.status === 'IN_PROGRESS') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">My Work Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const myRole = job.jobRoles?.find(r => r.id === job.hiredWorkers[0]?.jobRoleId);
                      const my = job.hiredWorkers[0] || {};
                      const draft = workDrafts['me'] || {};
                      const myPending = my.workStatus === 'COMPLETION_REQUESTED';
                      const myCompleted = my.workStatus === 'COMPLETED';
                      return (
                        <div className="space-y-2">
                          {myRole && <p className="text-sm text-muted-foreground">Role: {myRole.roleName}</p>}
                          <p className="text-sm">
                            {WORK_STATUS_LABELS[my.workStatus] || my.workStatus}
                            {myPending && (
                              <Badge className="ml-2 bg-yellow-500">Awaiting Employer Verification</Badge>
                            )}
                            {myCompleted && (
                              <Badge className="ml-2 bg-green-600">Verified & Available</Badge>
                            )}
                          </p>
                          {myPending ? (
                            <p className="text-sm text-muted-foreground">
                              Your completion request has been sent to the employer for verification. You'll be
                              notified once they accept (you'll be freed and available) or reject it.
                            </p>
                          ) : myCompleted ? (
                            <p className="text-sm text-muted-foreground">
                              Your work has been verified and accepted. You are now available for new jobs.
                            </p>
                          ) : (
                            <>
                              <div>
                                <Label className="text-xs">My Status</Label>
                                <Select
                                  value={(draft.workStatus ?? my.workStatus) || 'NOT_STARTED'}
                                  onValueChange={(v) => updateWorkDraft('me', 'workStatus', v)}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Note</Label>
                                <Textarea
                                  className="mt-1"
                                  rows={2}
                                  placeholder="Update the employer on your progress..."
                                  value={draft.workNote !== undefined ? draft.workNote : (my.workNote || '')}
                                  onChange={(e) => updateWorkDraft('me', 'workNote', e.target.value)}
                                />
                              </div>
                              <Button
                                className="w-full"
                                disabled={savingWork.me}
                                onClick={saveMyWorkStatus}
                              >
                                {savingWork.me ? 'Saving...' : 'Update My Progress'}
                              </Button>
                              <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                disabled={savingWork.me || job.status === 'COMPLETED' || job.status === 'CANCELLED'}
                                onClick={requestWorkCompletion}
                              >
                                {savingWork.me ? 'Sending...' : 'Mark My Work Complete'}
                              </Button>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {job.status === 'COMPLETED' && (
                <JobReviewPanel
                  job={job}
                  isEmployer={isEmployer}
                  onReviewSubmitted={fetchJob}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
