import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socket from '../services/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import NotificationBell from '@/components/NotificationBell';
import { showSuccess, showError } from '@/lib/toast';
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
  const [availability, setAvailability] = useState('AVAILABLE');
  const [activeTab, setActiveTab] = useState('jobs');
  const [loading, setLoading] = useState(true);
  const [historyDetails, setHistoryDetails] = useState({});
  const [applyJob, setApplyJob] = useState(null);
  const [applyRoleId, setApplyRoleId] = useState('');
  const [applying, setApplying] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [wageTypeFilter, setWageTypeFilter] = useState('');
  const [minWage, setMinWage] = useState('');
  const [maxWage, setMaxWage] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const allSkills = useMemo(() => {
    const set = new Set();
    jobs.forEach(j => j.requiredSkills?.forEach(s => set.add(s)));
    return [...set].sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(j =>
        j.title?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q)
      );
    }

    if (skillFilter) {
      result = result.filter(j =>
        j.requiredSkills?.some(s => s.toLowerCase() === skillFilter.toLowerCase())
      );
    }

    if (wageTypeFilter) {
      result = result.filter(j => j.wageType === wageTypeFilter);
    }

    const min = parseFloat(minWage);
    if (!isNaN(min)) {
      result = result.filter(j => j.wageAmount >= min);
    }

    const max = parseFloat(maxWage);
    if (!isNaN(max)) {
      result = result.filter(j => j.wageAmount <= max);
    }

    switch (sortBy) {
      case 'wage-high':
        result.sort((a, b) => (b.wageAmount || 0) - (a.wageAmount || 0));
        break;
      case 'wage-low':
        result.sort((a, b) => (a.wageAmount || 0) - (b.wageAmount || 0));
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    return result;
  }, [jobs, searchQuery, skillFilter, wageTypeFilter, minWage, maxWage, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSkillFilter('');
    setWageTypeFilter('');
    setMinWage('');
    setMaxWage('');
    setSortBy('newest');
  };

  const historyJobs = applications.filter(app => app.job?.status === 'COMPLETED');

  useEffect(() => {
    fetchData();
    const onNewNotification = () => fetchData();
    socket.on('notification:new', onNewNotification);
    return () => socket.off('notification:new', onNewNotification);
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
      const [jobsRes, appsRes, profileRes] = await Promise.all([
        api.get('/worker/jobs').catch(() => ({ data: { data: [] } })),
        api.get('/worker/applications').catch(() => ({ data: { data: [] } })),
        api.get('/worker/profile').catch(() => ({ data: { data: {} } }))
      ]);

      setJobs(jobsRes.data.data || []);
      setApplications(appsRes.data.data || []);
      setAvailability(profileRes.data.data?.availability || 'AVAILABLE');
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId) => {
    try {
      await api.post(`/worker/jobs/${jobId}/apply`);
      showSuccess('Application submitted!');
      setApplyJob(null);
      setApplyRoleId('');
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to apply');
    }
  };

  const handleApplyWithRole = async () => {
    setApplying(true);
    try {
      await api.post(`/worker/jobs/${applyJob.id}/apply`, { jobRoleId: applyRoleId || undefined });
      showSuccess('Application submitted!');
      setApplyJob(null);
      setApplyRoleId('');
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleCancelJob = async (jobId, title) => {
    if (!window.confirm(`Cancel your work on "${title || 'this job'}"? You will become available for new jobs.`)) return;
    try {
      await api.put(`/worker/jobs/${jobId}/cancel`);
      showSuccess('Job cancelled — you are now available.');
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel job');
    }
  };

  const handleAcceptOffer = async (appId) => {
    try {
      await api.post(`/worker/applications/${appId}/accept`);
      showSuccess('Offer accepted — you are now hired!');
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to accept offer');
    }
  };

  const handleRejectOffer = async (appId) => {
    if (!window.confirm('Reject this job offer?')) return;
    try {
      await api.post(`/worker/applications/${appId}/reject`);
      showSuccess('Offer rejected.');
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to reject offer');
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

            {/* Filters */}
            {jobs.length > 0 && (
              <Card>
                <CardContent className="py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Input
                      placeholder="Search by title or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    <Select value={skillFilter} onValueChange={setSkillFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Skills" />
                      </SelectTrigger>
                      <SelectContent>
                        {allSkills.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={wageTypeFilter} onValueChange={setWageTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Wage Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="HOURLY">Hourly</SelectItem>
                        <SelectItem value="PROJECT">Project</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      placeholder="Min wage ₹"
                      value={minWage}
                      onChange={(e) => setMinWage(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Max wage ₹"
                      value={maxWage}
                      onChange={(e) => setMaxWage(e.target.value)}
                    />

                    <div className="flex gap-2">
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest First</SelectItem>
                          <SelectItem value="wage-high">Wage: High → Low</SelectItem>
                          <SelectItem value="wage-low">Wage: Low → High</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={resetFilters} className="shrink-0">
                        Reset
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {jobs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No jobs available in your area right now.
                </CardContent>
              </Card>
            ) : filteredJobs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No jobs match your filters.
                </CardContent>
              </Card>
            ) : (
              filteredJobs.map((job) => (
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
                        app.status === 'OFFERED' ? 'outline' :
                        app.status === 'REJECTED' || app.status === 'OFFER_WITHDRAWN' ? 'destructive' : 'secondary'
                      }>
                        {app.status === 'OFFERED' ? 'OFFER RECEIVED' : app.status === 'OFFER_WITHDRAWN' ? 'OFFER WITHDRAWN' : app.status}
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
                    <div className="text-sm text-muted-foreground mt-2">
                        Role: <span className="font-medium text-foreground">
                          {app.jobRole?.roleName || 'Team member'}
                        </span>
                        {app.job && ` • ₹${app.job.wageAmount}/${app.job.wageType}`}
                      </div>
                      <div className="flex gap-2 mt-4">
                        {app.status === 'OFFERED' && (
                          <>
                            {availability === 'AVAILABLE' ? (
                              <>
                                <Button size="sm" onClick={() => handleAcceptOffer(app.id)}>
                                  Accept Offer
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleRejectOffer(app.id)}>
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="destructive" size="sm" onClick={() => handleRejectOffer(app.id)}>
                                  Reject
                                </Button>
                                <span className="text-xs text-amber-600 self-center">
                                  You're assigned to another job — finish or cancel it before accepting more offers.
                                </span>
                              </>
                            )}
                          </>
                        )}
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
