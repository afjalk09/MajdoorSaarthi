import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import NotificationBell from '@/components/NotificationBell';
import ReviewModal from '@/components/ReviewModal';
import DisputeForm from '@/components/DisputeForm';
import JobReviewPanel from '@/components/JobReviewPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WorkerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('jobs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [historyDetails, setHistoryDetails] = useState({});
  const [applyJob, setApplyJob] = useState(null);
  const [applyRoleId, setApplyRoleId] = useState('');
  const [applying, setApplying] = useState(false);

  const historyJobs = applications.filter(app => app.job?.status === 'COMPLETED');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab !== 'history') return;
    let cancelled = false;

    historyJobs.forEach(async (app) => {
      if (historyDetails[app.jobId]) return;
      try {
        const res = await api.get(`/jobs/${app.jobId}`);
        if (!cancelled) {
          setHistoryDetails(prev => ({ ...prev, [app.jobId]: res.data.data }));
        }
      } catch (err) {
        console.error('Failed to load job detail', err);
      }
    });

    return () => { cancelled = true; };
  }, [activeTab]);

  const refreshHistoryDetail = async (jobId) => {
    try {
      const res = await api.get(`/jobs/${jobId}`);
      setHistoryDetails(prev => ({ ...prev, [jobId]: res.data.data }));
      fetchData();
    } catch (err) {
      console.error('Failed to reload job detail', err);
    }
  };

  const fetchData = async () => {
    try {
      const [jobsRes, appsRes] = await Promise.all([
        api.get('/worker/jobs').catch(() => ({ data: { data: [] } })),
        api.get('/worker/applications').catch(() => ({ data: { data: [] } }))
      ]);

      setJobs(jobsRes.data.data || []);
      setApplications(appsRes.data.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId) => {
    try {
      await api.post(`/worker/jobs/${jobId}/apply`);
      setSuccess('Application submitted!');
      setApplyJob(null);
      setApplyRoleId('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply');
    }
  };

  const handleApplyWithRole = async () => {
    setApplying(true);
    setError('');
    try {
      await api.post(`/worker/jobs/${applyJob.id}/apply`, { jobRoleId: applyRoleId || undefined });
      setSuccess('Application submitted!');
      setApplyJob(null);
      setApplyRoleId('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleCancelJob = async (jobId, title) => {
    if (!window.confirm(`Cancel your work on "${title || 'this job'}"? You will become available for new jobs.`)) return;
    try {
      await api.put(`/worker/jobs/${jobId}/cancel`);
      setSuccess('Job cancelled — you are now available.');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel job');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">Worker Dashboard</h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Button variant="outline" onClick={() => navigate('/disputes')}>My Disputes</Button>
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" onClick={logout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/worker/profile')}
          >
            My Profile
          </Button>
          <Button
            variant={activeTab === 'jobs' ? 'default' : 'outline'}
            onClick={() => setActiveTab('jobs')}
          >
            Available Jobs
          </Button>
          <Button
            variant={activeTab === 'applications' ? 'default' : 'outline'}
            onClick={() => setActiveTab('applications')}
          >
            My Applications
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            onClick={() => setActiveTab('history')}
          >
            History
          </Button>
        </div>

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Available Jobs</h2>
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No jobs available in your area right now.
                </CardContent>
              </Card>
            ) : (
              jobs.map((job) => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{job.title}</CardTitle>
                        <CardDescription>
                          {job.locationText || 'Location not specified'}
                        </CardDescription>
                      </div>
                      <Badge>₹{job.wageAmount}/{job.wageType}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{job.description}</p>

                    {/* Role requirements */}
                    {job.jobRoles && job.jobRoles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {job.jobRoles.map((role, i) => (
                          <Badge key={i} variant="secondary">
                            {role.roleName}: {role.count - role.filledCount} needed
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.requiredSkills?.map((skill, i) => (
                        <Badge key={i} variant="outline">{skill}</Badge>
                      ))}
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Workers: {job.workersNeeded} | Duration: {job.durationDays} days
                      </span>
                      <Button onClick={() => { setApplyJob(job); setApplyRoleId(''); }}>Apply</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">My Applications</h2>
            {applications.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  You haven't applied to any jobs yet.
                </CardContent>
              </Card>
            ) : (
              applications.map((app) => (
                <Card key={app.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{app.job?.title}</CardTitle>
                        <CardDescription>{app.job?.locationText}</CardDescription>
                      </div>
                      <Badge variant={
                        app.status === 'HIRED' ? 'default' :
                        app.status === 'REJECTED' ? 'destructive' : 'secondary'
                      }>
                        {app.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        Applied: {new Date(app.appliedAt).toLocaleDateString()}
                      </span>
                      {app.matchScore && (
                        <span>Match Score: {app.matchScore}%</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      {app.status === 'HIRED' && (app.job?.status === 'OPEN' || app.job?.status === 'IN_PROGRESS') && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/jobs/${app.jobId}/track`)}>
                            Track Job
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleCancelJob(app.jobId, app.job?.title)}>
                            Cancel Job
                          </Button>
                          <DisputeForm jobId={app.jobId} onDisputeRaised={fetchData} />
                        </>
                      )}
                      {app.job?.status === 'COMPLETED' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/jobs/${app.jobId}/track`)}>
                            Review & Details
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Job History</h2>
            {historyJobs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No completed jobs yet.
                </CardContent>
              </Card>
            ) : (
              historyJobs.map((app) => {
                const detail = historyDetails[app.jobId];
                return (
                  <Card key={app.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{app.job?.title}</CardTitle>
                          <CardDescription>
                            {app.job?.locationText || 'Location not specified'}
                          </CardDescription>
                        </div>
                        <Badge>₹{app.job?.wageAmount}/{app.job?.wageType}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center text-sm mb-3">
                        <span className="text-muted-foreground">
                          Employer: {app.job?.employer?.displayName || 'N/A'}
                        </span>
                        <span className="text-muted-foreground">
                          Completed: {app.job?.updatedAt ? new Date(app.job.updatedAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      {detail ? (
                        <div className="space-y-3">
                          <JobReviewPanel
                            job={detail}
                            isEmployer={false}
                            onReviewSubmitted={() => refreshHistoryDetail(app.jobId)}
                          />
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!detail.reviewComplete}
                              onClick={() => navigate(`/jobs/${app.jobId}/track`)}
                            >
                              {detail.reviewComplete ? 'View Details' : 'Rate to unlock details'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Apply with role dialog */}
      <Dialog open={!!applyJob} onOpenChange={(open) => { if (!open) setApplyJob(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to {applyJob?.title}</DialogTitle>
          </DialogHeader>
          {applyJob && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                {applyJob.jobRoles && applyJob.jobRoles.length > 0
                  ? 'Choose the role you are applying for. Slots are filled on a first-come basis.'
                  : 'Apply to this job.'}
              </p>
              {applyJob.jobRoles && applyJob.jobRoles.length > 0 && (
                <div>
                  <Label>Role</Label>
                  <Select value={applyRoleId} onValueChange={setApplyRoleId}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {applyJob.jobRoles.map(role => {
                        const remaining = role.count - role.filledCount;
                        return (
                          <SelectItem key={role.id} value={role.id} disabled={remaining <= 0}>
                            {role.roleName} ({remaining} needed)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button
                  className="w-full"
                  disabled={applying}
                  onClick={handleApplyWithRole}
                >
                  {applying ? 'Applying...' : 'Submit Application'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkerDashboard;
