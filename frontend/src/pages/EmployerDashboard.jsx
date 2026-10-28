import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socket from '../services/socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import NotificationBell from '@/components/NotificationBell';
import { showSuccess, showError } from '@/lib/toast';
import DisputeForm from '@/components/DisputeForm';
import JobReviewPanel from '@/components/JobReviewPanel';
import PendingReviewsBanner from '@/components/PendingReviewsBanner';
import ReviewPromptDialog from '@/components/ReviewPromptDialog';
import RoleSelect from '@/components/RoleSelect';
import WorkerBanner from '@/components/WorkerBanner';
import WorkerRoleChips from '@/components/WorkerRoleChips';
import WorkerDetailsDialog from '@/components/WorkerDetailsDialog';
import PaymentList from '@/components/PaymentList';
import { formatExpectedWage, formatReliability, formatJobSchedule, formatMoney } from '@/lib/format';
import { applicationStatusLabelForEmployer, applicationsClosedReason, JOB_CLOSURE_META } from '@/lib/job';
import { MapPin } from 'lucide-react';

const EmployerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);

  // Job form
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [wageAmount, setWageAmount] = useState('');
  const [wageType, setWageType] = useState('DAILY');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [roleRequirements, setRoleRequirements] = useState([
    { roleName: '', count: 1 }
  ]);
  const [roleList, setRoleList] = useState([]);

  // Match modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [matches, setMatches] = useState([]);
  const [showMatches, setShowMatches] = useState(false);

  // Browse workers modal
  const [browseJob, setBrowseJob] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [showWorkers, setShowWorkers] = useState(false);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  // Applications modal
  const [appsJob, setAppsJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [showApps, setShowApps] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);

  // Chosen role id per worker being offered a job (keyed by workerId)
  const [hireRoles, setHireRoles] = useState({});

  // Worker details dialog, shared by all three modals below. `context` carries
  // the application/hired-worker record so the dialog can show job context.
  const [detailWorker, setDetailWorker] = useState(null);

  const setHireRole = (workerId, roleId) => {
    setHireRoles(prev => ({ ...prev, [workerId]: roleId }));
  };

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

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoleList(res.data.data || []);
    } catch (err) {
      console.error('Failed to load roles', err);
    }
  };

  const activeJobs = jobs.filter(j => j.status !== 'COMPLETED');
  const historyJobs = jobs.filter(j => j.status === 'COMPLETED');

  const [historyDetails, setHistoryDetails] = useState({});
  const [pendingReviewJobs, setPendingReviewJobs] = useState([]);

  useEffect(() => {
    if (activeTab !== 'history') return;
    let cancelled = false;

    historyJobs.forEach(async (job) => {
      if (historyDetails[job.id]) return;
      try {
        const res = await api.get(`/jobs/${job.id}`);
        if (!cancelled) {
          setHistoryDetails(prev => ({ ...prev, [job.id]: res.data.data }));
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
      for (const job of historyJobs) {
        try {
          const res = await api.get(`/jobs/${job.id}`);
          if (!cancelled && !res.data.data.reviewComplete) {
            pending.push({ id: job.id, title: job.title, locationText: job.locationText });
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
      const jobsRes = await api.get('/jobs').catch(() => ({ data: { data: [] } }));
      setJobs(jobsRes.data.data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const addRole = () => {
    setRoleRequirements([...roleRequirements, { roleName: '', count: 1 }]);
  };

  const removeRole = (index) => {
    if (roleRequirements.length <= 1) return;
    setRoleRequirements(roleRequirements.filter((_, i) => i !== index));
  };

  const updateRole = (index, field, value) => {
    const updated = [...roleRequirements];
    updated[index] = { ...updated[index], [field]: value };
    setRoleRequirements(updated);
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();

    const roleReqs = roleRequirements
      .filter(r => r.roleName.trim())
      .map(r => ({
        roleName: r.roleName.trim(),
        count: parseInt(r.count) || 1
      }));

    if (roleReqs.length === 0) {
      showError('Add at least one role with a name');
      return;
    }

    try {
      await api.post('/jobs', {
        title: jobTitle,
        description: jobDesc,
        role_requirements: roleReqs,
        location_text: jobLocation,
        wage_amount: parseFloat(wageAmount),
        wage_type: wageType,
        duration_days: parseInt(duration) || null,
        start_date: startDate || null,
        end_date: endDate || null,
        start_time: startTime || null,
        end_time: endTime || null
      });
      showSuccess('Job created successfully');
      setJobTitle('');
      setJobDesc('');
      setJobLocation('');
      setWageAmount('');
      setDuration('');
      setStartDate('');
      setEndDate('');
      setStartTime('');
      setEndTime('');
      setRoleRequirements([{ roleName: '', count: 1 }]);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create job');
    }
  };

  const handleGetMatches = async (job) => {
    setSelectedJob(job);
    try {
      const res = await api.get(`/jobs/${job.id}/matches`);
      setMatches(res.data.data || []);
      setShowMatches(true);
    } catch (err) {
      showError('Failed to get matches');
    }
  };

  const handleBrowseWorkers = async (job) => {
    setBrowseJob(job);
    setLoadingWorkers(true);
    try {
      const res = await api.get(`/employer/workers?job_id=${job.id}`);
      setWorkers(res.data.data || []);
      setShowWorkers(true);
    } catch (err) {
      showError('Failed to load workers');
    } finally {
      setLoadingWorkers(false);
    }
  };

  const handleHire = async (job, workerId, suggestedId) => {
    const closed = applicationsClosedReason(job);
    if (closed) {
      showError(closed === 'ENDED'
        ? 'This job has ended — no new offers can be sent'
        : 'This job has already started — no new offers can be sent');
      return;
    }
    const roleId = effectiveRoleId(job, workerId, suggestedId);
    try {
      await api.post(`/jobs/${job.id}/hire/${workerId}`, { jobRoleId: roleId });
      setHireRoles(prev => ({ ...prev, [workerId]: undefined }));
      showSuccess('Offer sent — awaiting worker acceptance');
      setShowMatches(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to hire worker');
    }
  };

  const handleAcceptApplication = async (job, workerId, suggestedId) => {
    const closed = applicationsClosedReason(job);
    if (closed) {
      showError(closed === 'ENDED'
        ? 'This job has ended — no new offers can be sent'
        : 'This job has already started — no new offers can be sent');
      return;
    }
    const roleId = effectiveRoleId(job, workerId, suggestedId);
    try {
      await api.post(`/jobs/${job.id}/hire/${workerId}`, { jobRoleId: roleId });
      setHireRoles(prev => ({ ...prev, [workerId]: undefined }));
      showSuccess('Offer sent — awaiting worker acceptance');
      setShowApps(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to accept application');
    }
  };

  const handleViewApplications = async (job) => {
    setAppsJob(job);
    setLoadingApplications(true);
    try {
      const res = await api.get(`/jobs/${job.id}/applications`);
      setApplications(res.data.data || []);
      setShowApps(true);
    } catch (err) {
      showError('Failed to load applications');
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleRemoveWorker = async (jobId, workerId, name) => {
    if (!window.confirm(`Remove ${name} from this job? The worker will become available again.`)) return;
    try {
      await api.post(`/jobs/${jobId}/remove/${workerId}`);
      showSuccess('Worker removed from job');
      if (appsJob) handleViewApplications(appsJob);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to remove worker');
    }
  };

  const handleStatusUpdate = async (jobId, status) => {
    try {
      await api.put(`/jobs/${jobId}/status`, { status });
      showSuccess('Job status updated');
      fetchData();
    } catch (err) {
      showError('Failed to update status');
    }
  };

  // Pick the role that will actually be offered: user's explicit choice if any,
  // else the suggested role (AI-matched / applied) if still open, else the role
  // with the most remaining capacity.
  const effectiveRoleId = (job, workerId, suggestedId) => {
    if (hireRoles[workerId]) return hireRoles[workerId];
    const roles = (job?.jobRoles || []).filter(r => (r.remainingCapacity ?? (r.count - (r.filledCount || 0))) > 0);
    if (suggestedId && roles.some(r => r.id === suggestedId)) return suggestedId;
    if (roles.length === 0) return undefined;
    return [...roles].sort((a, b) => {
      const ra = a.remainingCapacity ?? (a.count - (a.filledCount || 0));
      const rb = b.remainingCapacity ?? (b.count - (b.filledCount || 0));
      return rb - ra;
    })[0].id;
  };

  const renderRoleSelect = (job, workerId, suggestedId, disabled = false) => {
    const roles = (job?.jobRoles || []).filter(r => (r.remainingCapacity ?? (r.count - (r.filledCount || 0))) > 0);
    if (roles.length === 0) {
      return (
        <p className="text-xs text-red-500">No role has an available slot.</p>
      );
    }
    // Single open role: auto-select it — no dropdown needed.
    if (roles.length === 1) {
      const role = roles[0];
      return (
        <p className="text-sm text-muted-foreground">
          Role: <span className="font-medium text-foreground">{role.roleName}</span>
          <span className="ml-1">({role.filledCount || 0}/{role.count} filled)</span>
        </p>
      );
    }
    const value = effectiveRoleId(job, workerId, suggestedId);
    return (
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => setHireRole(workerId, e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {roles.map(r => (
          <option key={r.id} value={r.id}>
            {r.roleName} ({r.filledCount || 0}/{r.count} filled)
          </option>
        ))}
      </select>
    );
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Date gate mirror of backend/src/lib/jobDates.js: once a job's start moment
  // passes, no new offers or application acceptances are possible.
  const selectedJobClosed = selectedJob ? applicationsClosedReason(selectedJob) : null;
  const browseJobClosed = browseJob ? applicationsClosedReason(browseJob) : null;
  const appsJobClosed = appsJob ? applicationsClosedReason(appsJob) : null;
  const gateText = (reason) =>
    reason ? (reason === 'ENDED' ? 'Job ended' : 'Job started') : null;

  return (
    <>
      <main className="section-container py-8">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'create', label: 'Create Job' },
            { key: 'jobs', label: 'My Jobs' },
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
                  layoutId="employer-tab-bg"
                  className="absolute inset-0 bg-gradient-to-r from-earth-500 to-earth-600 rounded-xl shadow-md"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
          <button
            onClick={() => navigate('/employer/profile')}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 transition-colors whitespace-nowrap"
          >
            My Profile
          </button>
        </div>

        {activeTab !== 'history' && <PendingReviewsBanner pendingJobs={pendingReviewJobs} />}
        <ReviewPromptDialog pendingJobs={pendingReviewJobs} />

        {/* Create Job Tab */}
        {activeTab === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>Post a New Job</CardTitle>
              <CardDescription>Describe the work you need done and required roles</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateJob} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Building renovation work" required />
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={jobLocation} onChange={(e) => setJobLocation(e.target.value)} placeholder="Andheri, Mumbai" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <textarea
                      value={jobDesc}
                      onChange={(e) => setJobDesc(e.target.value)}
                      placeholder="Describe the job requirements..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Wage Amount (₹)</Label>
                    <Input type="number" value={wageAmount} onChange={(e) => setWageAmount(e.target.value)} placeholder="500" required />
                  </div>

                  <div className="space-y-2">
                    <Label>Wage Type</Label>
                    <select
                      value={wageType}
                      onChange={(e) => setWageType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                    >
                      <option value="DAILY">Per Day</option>
                      <option value="HOURLY">Per Hour</option>
                      <option value="PROJECT">Per Project</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (days)</Label>
                    <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="5" />
                  </div>

                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>

                {/* Role Requirements */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">Worker Roles Required</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addRole}>
                      + Add Role
                    </Button>
                  </div>

                  {roleRequirements.map((role, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                      <div className="col-span-7 space-y-1">
                        <Label className="text-xs">Role Name</Label>
                        <RoleSelect
                          value={role.roleName}
                          onChange={(val) => updateRole(index, 'roleName', val)}
                          roles={roleList}
                          placeholder="Type to search a role"
                        />
                      </div>
                      <div className="col-span-4 space-y-1">
                        <Label className="text-xs">Count</Label>
                        <Input
                          type="number"
                          value={role.count}
                          onChange={(e) => updateRole(index, 'count', e.target.value)}
                          min="1"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRole(index)}
                          disabled={roleRequirements.length <= 1}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button type="submit">Post Job</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* My Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">My Jobs</h2>
            {activeJobs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  You haven't posted any jobs yet.
                </CardContent>
              </Card>
            ) : (
              activeJobs.map((job) => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{job.title}</CardTitle>
                        <CardDescription>{job.locationText}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge>₹{job.wageAmount}/{job.wageType}</Badge>
                        <Badge variant={
                          job.status === 'OPEN' ? 'default' :
                          job.status === 'COMPLETED' ? 'secondary' : 'outline'
                        }>
                          {job.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{job.description}</p>

                    {/* Role breakdown */}
                    {job.jobRoles && job.jobRoles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {job.jobRoles.map((role, i) => (
                          <Badge key={i} variant="secondary">
                            {role.roleName}: {role.filledCount}/{role.count}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {formatJobSchedule(job) && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Schedule: {formatJobSchedule(job)}
                      </p>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Total Workers: {job.workersNeeded} | Duration: {job.durationDays} days
                      </span>
                      <div className="flex gap-2">
                        {job.status === 'OPEN' && (
                          <>
                            {job.totalHired > 0 && (
                              <>
                                <Button variant="outline" onClick={() => navigate(`/jobs/${job.id}/track`)}>
                                  Track Job
                                </Button>
                                <Button onClick={() => handleStatusUpdate(job.id, 'completed')}>
                                  Mark Completed
                                </Button>
                              </>
                            )}
                            <Button variant="outline" onClick={() => navigate(`/employer/jobs/${job.id}/edit`)}>
                              Edit
                            </Button>
                            <Button variant="outline" onClick={() => handleGetMatches(job)}>
                              AI Match
                            </Button>
                            <Button variant="outline" onClick={() => handleViewApplications(job)}>
                              Applications
                            </Button>
                            <Button variant="outline" onClick={() => handleBrowseWorkers(job)}>
                              Browse Workers
                            </Button>
                            <Button variant="destructive" onClick={() => handleStatusUpdate(job.id, 'cancelled')}>
                              Cancel
                            </Button>
                          </>
                        )}
                        {job.status === 'IN_PROGRESS' && (
                          <>
                            <Button variant="outline" onClick={() => navigate(`/jobs/${job.id}/track`)}>
                              Track Job
                            </Button>
                            <Button onClick={() => handleStatusUpdate(job.id, 'completed')}>
                              Mark Completed
                            </Button>
                            <DisputeForm jobId={job.id} onDisputeRaised={fetchData} />
                          </>
                        )}
                      </div>
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
              historyJobs.map((job) => {
                const detail = historyDetails[job.id];
                return (
                  <Card key={job.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{job.title}</CardTitle>
                          <CardDescription>{job.locationText}</CardDescription>
                        </div>
                        <Badge variant="secondary">COMPLETED</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center text-sm mb-3">
                        <span className="text-muted-foreground">
                          Total Workers: {job.workersNeeded} | Duration: {job.durationDays} days
                        </span>
                        <span className="text-muted-foreground">
                          Completed: {job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      {formatJobSchedule(job) && (
                        <p className="text-sm text-muted-foreground mb-3">
                          Schedule: {formatJobSchedule(job)}
                        </p>
                      )}
                      {detail ? (
                        <div className="space-y-3">
                          <JobReviewPanel
                            job={detail}
                            isEmployer={true}
                            onReviewSubmitted={() => refreshHistoryDetail(job.id)}
                          />
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/jobs/${job.id}/track`)}
                            >
                              View Details
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
          // Employer figures are GROSS (what they pay) — the 5% platform fee
          // deduction is shown per row so both sides of the split are visible.
          const paidTotal = payments
            .filter(p => p.status === 'COMPLETED')
            .reduce((sum, p) => sum + p.amount, 0);
          const pendingTotal = payments
            .filter(p => p.status === 'PENDING')
            .reduce((sum, p) => sum + p.amount, 0);

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-semibold">Payments Sent</h2>
                <div className="flex gap-6">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="font-semibold text-green-600">{formatMoney(paidTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
                    <p className="font-semibold text-amber-600">{formatMoney(pendingTotal)}</p>
                  </div>
                </div>
              </div>

              <Card>
                <CardContent className="py-6">
                  <PaymentList
                    payments={payments}
                    isEmployer
                    onChanged={fetchPayments}
                    showJob
                  />
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground">
                Send new payments from a job's tracking page — open{' '}
                <span className="font-medium">My Jobs → View Details</span> and use the Pay
                button next to a hired worker.
              </p>
            </div>
          );
        })()}

        {/* Matches Modal */}
        <Dialog open={showMatches && !!selectedJob} onOpenChange={(o) => !o && setShowMatches(false)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="pr-6">AI Matched Workers</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <span>For: {selectedJob?.title}</span>
                {selectedJobClosed && (
                  <Badge className={JOB_CLOSURE_META[selectedJobClosed].className}>
                    {gateText(selectedJobClosed)} — no new offers
                  </Badge>
                )}
              </DialogDescription>
            </DialogHeader>

            {matches.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No matching workers found. Try adjusting your job requirements.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {matches.map((match) => (
                  <div key={match.worker_id} className="border rounded-xl p-4 flex flex-col">
                    <div className="flex items-start gap-3 mb-2">
                      <WorkerBanner
                        worker={{
                          fullName: match.full_name,
                          roles: match.roles,
                          locationText: match.location_text,
                          profilePhoto: match.profile_photo,
                          reliabilityScore: match.reliability_score
                        }}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold truncate">{match.full_name}</h4>
                          <Badge className="bg-gradient-to-r from-saffron-500 to-saffron-600">{match.match_score}% match</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-saffron-500" />
                          {match.location_text}
                        </p>
                        {(match.roles || []).length > 0 && (
                          <WorkerRoleChips roles={match.roles} className="mt-1.5" />
                        )}
                      </div>
                    </div>
                    <div className="mb-2">
                      {renderRoleSelect(selectedJob, match.worker_id, match.suggestedRole?.id, !!selectedJobClosed)}
                    </div>
                    <ul className="text-xs text-muted-foreground mb-3 flex-1">
                      {match.match_reasons?.map((reason, i) => (
                        <li key={i}>• {reason}</li>
                      ))}
                    </ul>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => setDetailWorker({ workerId: match.worker_id, context: null })}
                      >
                        Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-earth-500 to-earth-600 hover:from-earth-600 hover:to-earth-700 text-white"
                        disabled={!!selectedJobClosed || !effectiveRoleId(selectedJob, match.worker_id, match.suggestedRole?.id)}
                        onClick={() => handleHire(selectedJob, match.worker_id, match.suggestedRole?.id)}
                      >
                        {selectedJobClosed ? gateText(selectedJobClosed) : 'Send Offer'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Browse Workers Modal */}
        <Dialog open={showWorkers && !!browseJob} onOpenChange={(o) => !o && setShowWorkers(false)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="pr-6">Workers at {browseJob?.locationText}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <span>For: {browseJob?.title}</span>
                {browseJobClosed && (
                  <Badge className={JOB_CLOSURE_META[browseJobClosed].className}>
                    {gateText(browseJobClosed)} — no new offers
                  </Badge>
                )}
              </DialogDescription>
            </DialogHeader>

            {loadingWorkers ? (
              <p className="text-center text-muted-foreground py-4">Loading workers...</p>
            ) : workers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No available workers found at this location.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {workers.map((worker) => {
                  const reliability = formatReliability(worker.reliabilityScore);
                  const wage = formatExpectedWage(worker);

                  return (
                    <div key={worker.id} className="border rounded-xl p-4 flex flex-col">
                      <div className="flex items-start gap-3 mb-2">
                        <WorkerBanner worker={worker} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold truncate">{worker.fullName}</h4>
                            {reliability && (
                              <Badge variant="outline" className="shrink-0">★ {reliability}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="text-saffron-500" />
                            {worker.locationText}
                          </p>
                          <WorkerRoleChips roles={worker.roles} className="mt-1.5" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Experience: {worker.experienceYears} yrs
                        {wage && <> | Wage: {wage}</>}
                      </p>
                      <div className="mb-3">
                        {renderRoleSelect(browseJob, worker.id, undefined, !!browseJobClosed)}
                      </div>
                      <div className="mt-auto flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => setDetailWorker({ workerId: worker.id, context: null })}
                        >
                          Details
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-earth-500 to-earth-600 hover:from-earth-600 hover:to-earth-700 text-white"
                          disabled={!!browseJobClosed || !effectiveRoleId(browseJob, worker.id)}
                          onClick={() => handleHire(browseJob, worker.id)}
                        >
                          {browseJobClosed ? gateText(browseJobClosed) : 'Send Offer'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Applications Modal */}
        <Dialog open={showApps && !!appsJob} onOpenChange={(o) => !o && setShowApps(false)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="pr-6">Job Applications</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <span>For: {appsJob?.title}</span>
                {appsJobClosed && (
                  <Badge className={JOB_CLOSURE_META[appsJobClosed].className}>
                    {gateText(appsJobClosed)} — no new offers
                  </Badge>
                )}
              </DialogDescription>
            </DialogHeader>

            {loadingApplications ? (
              <p className="text-center text-muted-foreground py-4">Loading applications...</p>
            ) : applications.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No applications yet.
              </p>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app.id} className="border rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <WorkerBanner worker={app.worker} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold truncate">{app.worker?.fullName}</h4>
                          <Badge
                            variant={
                              app.status === 'PENDING' ? 'secondary'
                                : app.status === 'OFFERED' ? 'outline'
                                : app.status === 'OFFER_WITHDRAWN' ? 'secondary'
                                : 'default'
                            }
                          >
                            {applicationStatusLabelForEmployer(app.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-saffron-500" />
                          {app.worker?.locationText}
                        </p>
                        <WorkerRoleChips roles={app.worker?.roles} className="mt-1.5" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Applied: {new Date(app.appliedAt).toLocaleDateString()}
                        </p>
                        {app.jobRole && (
                          <p className="text-xs text-blue-600">
                            Role: {app.jobRole.roleName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => setDetailWorker({ workerId: app.workerId, context: app })}
                      >
                        Details
                      </Button>

                      {app.status === 'PENDING' && (
                        <>
                          <div className="flex-1 min-w-[180px]">
                            {renderRoleSelect(appsJob, app.workerId, app.jobRoleId, !!appsJobClosed)}
                          </div>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-earth-500 to-earth-600 hover:from-earth-600 hover:to-earth-700 text-white"
                            disabled={!!appsJobClosed || !effectiveRoleId(appsJob, app.workerId, app.jobRoleId)}
                            onClick={() => handleAcceptApplication(appsJob, app.workerId, app.jobRoleId)}
                          >
                            {appsJobClosed ? gateText(appsJobClosed) : 'Send Offer'}
                          </Button>
                        </>
                      )}
                      {app.status === 'HIRED' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveWorker(appsJob.id, app.workerId, app.worker?.fullName)}
                        >
                          Remove Worker
                        </Button>
                      )}
                    </div>

                    {app.status === 'OFFERED' && (
                      <p className="text-xs text-blue-600 pt-1">
                        Offer sent{app.jobRole ? ` for ${app.jobRole.roleName}` : ''} — waiting for the worker to accept or reject.
                      </p>
                    )}
                    {app.status === 'OFFER_WITHDRAWN' && (
                      <p className="text-xs text-amber-600 pt-1">
                        Offer withdrawn — another worker accepted this role.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Worker details, opened from any of the three modals above */}
        <WorkerDetailsDialog
          workerId={detailWorker?.workerId}
          open={!!detailWorker}
          onOpenChange={(o) => !o && setDetailWorker(null)}
          application={detailWorker?.context}
        />
      </main>
    </>
  );
};

export default EmployerDashboard;
