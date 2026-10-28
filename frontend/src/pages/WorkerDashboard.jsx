import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import PendingReviewsBanner from '@/components/PendingReviewsBanner';
import ReviewPromptDialog from '@/components/ReviewPromptDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import JobBanner from '@/components/JobBanner';
import JobImage from '@/components/JobImage';
import JobRoleChips from '@/components/JobRoleChips';
import JobDetailsDialog from '@/components/JobDetailsDialog';
import PaymentList from '@/components/PaymentList';
import { formatJobSchedule, formatMoney } from '@/lib/format';
import { applicationsClosedReason, JOB_CLOSURE_META } from '@/lib/job';
import { MapPin } from 'lucide-react';

const WorkerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [availability, setAvailability] = useState('AVAILABLE');
  const [activeTab, setActiveTab] = useState('jobs');
  const [loading, setLoading] = useState(true);
  const [historyDetails, setHistoryDetails] = useState({});
  const [pendingReviewJobs, setPendingReviewJobs] = useState([]);
  const [applyJob, setApplyJob] = useState(null);
  const [applyRoleId, setApplyRoleId] = useState('');
  const [applying, setApplying] = useState(false);
  const [detailJobId, setDetailJobId] = useState(null);
  const [detailApp, setDetailApp] = useState(null);
  const [payments, setPayments] = useState([]);

  // Open the shared job + employer details modal. Pass the worker's
  // application (from the Applications / History tabs) to show their standing.
  const openDetails = (job, application = null) => {
    setDetailJobId(job.id);
    setDetailApp(application);
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [roleOptions, setRoleOptions] = useState([]);
  const [wageTypeFilter, setWageTypeFilter] = useState('');
  const [minWage, setMinWage] = useState('');
  const [maxWage, setMaxWage] = useState('');
  const [sortBy, setSortBy] = useState('best-match');

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoleOptions(res.data.data || []);
    } catch (err) {
      console.error('Failed to load roles', err);
    }
  };

  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(j =>
        j.title?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q)
      );
    }

    if (roleFilter) {
      result = result.filter(j =>
        j.jobRoles?.some(r => r.roleName.toLowerCase() === roleFilter.toLowerCase())
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
      case 'best-match':
      default:
        // Role-matched jobs first (server marks them via matchedRoles), then newest.
        result.sort((a, b) => {
          const aMatch = (a.matchedRoles?.length || 0) > 0 ? 1 : 0;
          const bMatch = (b.matchedRoles?.length || 0) > 0 ? 1 : 0;
          if (aMatch !== bMatch) return bMatch - aMatch;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    return result;
  }, [jobs, searchQuery, roleFilter, wageTypeFilter, minWage, maxWage, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setRoleFilter('');
    setWageTypeFilter('');
    setMinWage('');
    setMaxWage('');
    setSortBy('best-match');
  };

  const historyJobs = applications.filter(app => app.job?.status === 'COMPLETED');

  useEffect(() => {
    fetchData();
    fetchRoles();
    const onNewNotification = () => {
      fetchData();
      fetchPayments();
    };
    socket.on('notification:new', onNewNotification);
    return () => socket.off('notification:new', onNewNotification);
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await api.get('/payments');
      setPayments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load payments', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'payments') fetchPayments();
  }, [activeTab]);

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

  // Fetch pending review status for completed jobs
  useEffect(() => {
    if (historyJobs.length === 0) {
      setPendingReviewJobs([]);
      return;
    }
    let cancelled = false;
    const fetchPending = async () => {
      const pending = [];
      for (const app of historyJobs) {
        try {
          const res = await api.get(`/jobs/${app.jobId}`);
          if (!cancelled && !res.data.data.reviewComplete) {
            pending.push({ id: app.jobId, title: app.job?.title || 'Untitled', locationText: app.job?.locationText });
          }
        } catch {
          // skip
        }
      }
      if (!cancelled) setPendingReviewJobs(pending);
    };
    fetchPending();
    return () => { cancelled = true; };
  }, [historyJobs.length]);

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
    return (
      <div className="section-container min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-saffron-200 border-t-saffron-500 rounded-full animate-spin" />
          <p className="text-warm-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Re-evaluated on render, so an Apply dialog left open past the start
  // moment disables itself without a refetch.
  const applyClosedReason = applyJob ? applicationsClosedReason(applyJob) : null;

  // An OFFERED application whose job has already started (or ended) can be
  // declined but not accepted — mirrors the backend gate on /accept.
  const offerClosedReason = (app) =>
    app?.status === 'OFFERED' ? applicationsClosedReason(app.job) : null;

    return (
    <>
      <main className="section-container py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'jobs', label: 'Available Jobs' },
            { key: 'applications', label: 'My Applications' },
            { key: 'history', label: 'History' },
            { key: 'payments', label: 'Payments' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-white'
                  : 'text-warm-600 hover:text-warm-900 hover:bg-warm-100'
              }`}
            >
              {activeTab === tab.key && (
                <motion.div
                  layoutId="worker-tab-bg"
                  className="absolute inset-0 bg-saffron-600 rounded-xl shadow-md"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
          <button
            onClick={() => navigate('/worker/profile')}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 transition-colors whitespace-nowrap"
          >
            My Profile
          </button>
        </div>

        {activeTab !== 'history' && <PendingReviewsBanner pendingJobs={pendingReviewJobs} />}
        <ReviewPromptDialog pendingJobs={pendingReviewJobs} />

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

                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Roles" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map(r => (
                          <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
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
                          <SelectItem value="best-match">Best For My Role</SelectItem>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredJobs.map((job) => {
                  // Date gate: a job that has started (or ended) still shows in the
                  // list, but with Apply disabled and a badge saying why.
                  const closedReason = applicationsClosedReason(job);
                  const closure = closedReason ? JOB_CLOSURE_META[closedReason] : null;

                  return (
                  <Card key={job.id} className="overflow-hidden flex flex-col group hover:shadow-lg transition-shadow duration-200">
                    <JobBanner job={job} aspect="aspect-[4/3]" />
                    <CardContent className="flex-1 flex flex-col p-4">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <CardTitle className="text-base leading-snug line-clamp-1">{job.title}</CardTitle>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {closure && (
                            <Badge className={closure.className}>{closure.label}</Badge>
                          )}
                          <Badge>₹{job.wageAmount}<span className="text-[10px] opacity-80">/{job.wageType}</span></Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <MapPin size={11} />
                        {job.locationText || 'Location not specified'}
                      </p>

                      {job.matchedRoles?.length > 0 && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 mb-2 self-start">
                          Fits your role
                        </Badge>
                      )}

                      {job.jobRoles && job.jobRoles.length > 0 && (
                        <JobRoleChips jobRoles={job.jobRoles} limit={3} className="mb-3" />
                      )}

                      <div className="mt-auto pt-3 border-t border-warm-100 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {job.workersNeeded} workers · {job.durationDays} days
                        </span>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetails(job)}
                          >
                            Details
                          </Button>
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-saffron-700"
                            disabled={!!closedReason}
                            title={closedReason === 'ENDED' ? 'This job has ended' : closedReason ? 'This job has already started' : undefined}
                            onClick={() => { setApplyJob(job); setApplyRoleId(''); }}
                          >
                            {closedReason ? 'Closed' : 'Apply'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
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
                    <div className="flex gap-4 items-start">
                      <JobImage
                        job={app.job}
                        className="w-16 h-16 xl:w-20 xl:h-20 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0 flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <CardTitle className="line-clamp-1">{app.job?.title}</CardTitle>
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
                      {formatJobSchedule(app.job) && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Schedule: {formatJobSchedule(app.job)}
                        </p>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetails(app.job, app)}
                        >
                          Details
                        </Button>
                        {app.status === 'OFFERED' && (
                          <>
                            {availability === 'AVAILABLE' ? (
                              <>
                                <Button
                                  size="sm"
                                  disabled={!!offerClosedReason(app)}
                                  title={offerClosedReason(app)
                                    ? (offerClosedReason(app) === 'ENDED' ? 'This job has ended' : 'This job has already started')
                                    : undefined}
                                  onClick={() => handleAcceptOffer(app.id)}
                                >
                                  Accept Offer
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleRejectOffer(app.id)}>
                                  Reject
                                </Button>
                                {offerClosedReason(app) && (
                                  <span className="text-xs text-amber-600 self-center">
                                    {offerClosedReason(app) === 'ENDED'
                                      ? 'This job has ended — the offer can no longer be accepted.'
                                      : 'This job has already started — the offer can no longer be accepted.'}
                                  </span>
                                )}
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
                      <div className="flex gap-4 items-start">
                        <JobImage
                          job={app.job}
                          className="w-16 h-16 xl:w-20 xl:h-20 rounded-xl object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0 flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <CardTitle className="line-clamp-1">{app.job?.title}</CardTitle>
                            <CardDescription>
                              {app.job?.locationText || 'Location not specified'}
                            </CardDescription>
                          </div>
                          <Badge>₹{app.job?.wageAmount}/{app.job?.wageType}</Badge>
                        </div>
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
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetails(app.job, app)}
                            >
                              Job & Employer Details
                            </Button>
                            <Button
                              size="sm"
                              disabled={!detail.reviewComplete}
                              onClick={() => navigate(`/jobs/${app.jobId}/track`)}
                            >
                              {detail.reviewComplete ? 'Open Job Page' : 'Rate to unlock'}
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
        {/* Payments Tab */}
        {activeTab === 'payments' && (() => {
          // Worker figures are NET of the 5% platform fee — that's what lands
          // in their pocket, so the totals and the rows both show netAmount.
          const confirmedTotal = payments
            .filter(p => p.status === 'COMPLETED')
            .reduce((sum, p) => sum + (p.netAmount ?? p.amount), 0);
          const pendingTotal = payments
            .filter(p => p.status === 'PENDING')
            .reduce((sum, p) => sum + (p.netAmount ?? p.amount), 0);
          const needsAction = payments.filter(p => p.status === 'PENDING').length;

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-semibold">My Payments</h2>
                <div className="flex gap-6">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Confirmed earnings</p>
                    <p className="font-semibold text-green-600">{formatMoney(confirmedTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Awaiting you{needsAction > 0 ? ` (${needsAction})` : ''}
                    </p>
                    <p className="font-semibold text-amber-600">{formatMoney(pendingTotal)}</p>
                  </div>
                </div>
              </div>

              <Card>
                <CardContent className="py-6">
                  <PaymentList
                    payments={payments}
                    isEmployer={false}
                    onChanged={fetchPayments}
                    showJob
                  />
                </CardContent>
              </Card>
            </div>
          );
        })()}
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
              {applyClosedReason && (
                <p className="text-sm font-medium text-destructive">
                  {applyClosedReason === 'ENDED'
                    ? 'This job has ended — applications are closed.'
                    : 'This job has already started — applications are closed.'}
                </p>
              )}
              {applyJob.jobRoles && applyJob.jobRoles.length > 0 && (
                <div>
                  <Label>Role</Label>
                  <Select value={applyRoleId} onValueChange={setApplyRoleId}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {applyJob.jobRoles.map(role => {
                        const remaining = role.remainingCapacity ?? (role.count - (role.filledCount || 0));
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
                  disabled={applying || !!applyClosedReason}
                  onClick={handleApplyWithRole}
                >
                  {applying ? 'Applying...' : 'Submit Application'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Job + employer details (Available Jobs, My Applications, History) */}
      <JobDetailsDialog
        jobId={detailJobId}
        open={!!detailJobId}
        onOpenChange={(open) => { if (!open) { setDetailJobId(null); setDetailApp(null); } }}
        application={detailApp}
      />
    </>
  );
};

export default WorkerDashboard;
