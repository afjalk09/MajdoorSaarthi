import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import NotificationBell from '@/components/NotificationBell';
import DisputeForm from '@/components/DisputeForm';
import JobReviewPanel from '@/components/JobReviewPanel';

const EmployerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Job form
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [wageAmount, setWageAmount] = useState('');
  const [wageType, setWageType] = useState('DAILY');
  const [duration, setDuration] = useState('');
  const [roleRequirements, setRoleRequirements] = useState([
    { roleName: '', skills: '', count: 1 }
  ]);

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

  const setHireRole = (workerId, roleId) => {
    setHireRoles(prev => ({ ...prev, [workerId]: roleId }));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeJobs = jobs.filter(j => j.status !== 'COMPLETED');
  const historyJobs = jobs.filter(j => j.status === 'COMPLETED');

  const [historyDetails, setHistoryDetails] = useState({});

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
    setRoleRequirements([...roleRequirements, { roleName: '', skills: '', count: 1 }]);
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
    setError('');
    setSuccess('');

    const roleReqs = roleRequirements
      .filter(r => r.roleName.trim())
      .map(r => ({
        roleName: r.roleName.trim(),
        skills: r.skills.split(',').map(s => s.trim()).filter(s => s),
        count: parseInt(r.count) || 1
      }));

    if (roleReqs.length === 0) {
      setError('Add at least one role with a name');
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
        duration_days: parseInt(duration) || null
      });
      setSuccess('Job created successfully');
      setJobTitle('');
      setJobDesc('');
      setJobLocation('');
      setWageAmount('');
      setDuration('');
      setRoleRequirements([{ roleName: '', skills: '', count: 1 }]);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create job');
    }
  };

  const handleGetMatches = async (job) => {
    setSelectedJob(job);
    try {
      const res = await api.get(`/jobs/${job.id}/matches`);
      setMatches(res.data.data || []);
      setShowMatches(true);
    } catch (err) {
      setError('Failed to get matches');
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
      setError('Failed to load workers');
    } finally {
      setLoadingWorkers(false);
    }
  };

  const handleHire = async (job, workerId, suggestedId) => {
    const roleId = effectiveRoleId(job, workerId, suggestedId);
    try {
      await api.post(`/jobs/${job.id}/hire/${workerId}`, { jobRoleId: roleId });
      setHireRoles(prev => ({ ...prev, [workerId]: undefined }));
      setSuccess('Offer sent — awaiting worker acceptance');
      setShowMatches(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to hire worker');
    }
  };

  const handleAcceptApplication = async (job, workerId, suggestedId) => {
    const roleId = effectiveRoleId(job, workerId, suggestedId);
    try {
      await api.post(`/jobs/${job.id}/hire/${workerId}`, { jobRoleId: roleId });
      setHireRoles(prev => ({ ...prev, [workerId]: undefined }));
      setSuccess('Offer sent — awaiting worker acceptance');
      setShowApps(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept application');
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
      setError('Failed to load applications');
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleRemoveWorker = async (jobId, workerId, name) => {
    if (!window.confirm(`Remove ${name} from this job? The worker will become available again.`)) return;
    try {
      await api.post(`/jobs/${jobId}/remove/${workerId}`);
      setSuccess('Worker removed from job');
      if (appsJob) handleViewApplications(appsJob);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove worker');
    }
  };

  const handleStatusUpdate = async (jobId, status) => {
    try {
      await api.put(`/jobs/${jobId}/status`, { status });
      setSuccess('Job status updated');
      fetchData();
    } catch (err) {
      setError('Failed to update status');
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

  const renderRoleSelect = (job, workerId, suggestedId) => {
    const roles = (job?.jobRoles || []).filter(r => (r.remainingCapacity ?? (r.count - (r.filledCount || 0))) > 0);
    if (roles.length === 0) {
      return (
        <p className="text-xs text-red-500">No role has an available slot.</p>
      );
    }
    const value = effectiveRoleId(job, workerId, suggestedId);
    return (
      <select
        value={value}
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">Employer Dashboard</h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Button variant="outline" onClick={() => navigate('/browse-workers')}>Browse Workers</Button>
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

        <div className="flex gap-2 mb-6">
          <Button variant="outline" onClick={() => navigate('/employer/profile')}>My Profile</Button>
          <Button variant={activeTab === 'create' ? 'default' : 'outline'} onClick={() => setActiveTab('create')}>Create Job</Button>
          <Button variant={activeTab === 'jobs' ? 'default' : 'outline'} onClick={() => setActiveTab('jobs')}>My Jobs</Button>
          <Button variant={activeTab === 'history' ? 'default' : 'outline'} onClick={() => setActiveTab('history')}>History</Button>
        </div>

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
                      <div className="col-span-4 space-y-1">
                        <Label className="text-xs">Role Name</Label>
                        <Input
                          value={role.roleName}
                          onChange={(e) => updateRole(index, 'roleName', e.target.value)}
                          placeholder="e.g., Carpenter"
                        />
                      </div>
                      <div className="col-span-5 space-y-1">
                        <Label className="text-xs">Skills (comma separated)</Label>
                        <Input
                          value={role.skills}
                          onChange={(e) => updateRole(index, 'skills', e.target.value)}
                          placeholder="carpentry, woodworking"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
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

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Total Workers: {job.workersNeeded} | Duration: {job.durationDays} days
                      </span>
                      <div className="flex gap-2">
                        {job.status === 'OPEN' && (
                          <>
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
                              disabled={!detail.reviewComplete}
                              onClick={() => navigate(`/jobs/${job.id}/track`)}
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

        {/* Matches Modal */}
        {showMatches && selectedJob && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>AI Matched Workers</CardTitle>
                    <CardDescription>For: {selectedJob.title}</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowMatches(false)}>×</Button>
                </div>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No matching workers found. Try adjusting your job requirements.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <div key={match.worker_id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{match.full_name}</h4>
                            <p className="text-sm text-muted-foreground">{match.location_text}</p>
                          </div>
                          <Badge className="bg-green-600">{match.match_score}% match</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {match.skills?.map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                          ))}
                        </div>
                        <div className="mb-2">
                          {renderRoleSelect(selectedJob, match.worker_id, match.suggestedRole?.id)}
                        </div>
                        <ul className="text-xs text-muted-foreground mb-3">
                          {match.match_reasons?.map((reason, i) => (
                            <li key={i}>• {reason}</li>
                          ))}
                        </ul>
                        <Button
                          size="sm"
                          onClick={() => handleHire(selectedJob, match.worker_id, match.suggestedRole?.id)}
                        >
                          Send Offer
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Browse Workers Modal */}
        {showWorkers && browseJob && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Workers at {browseJob.locationText}</CardTitle>
                    <CardDescription>For: {browseJob.title}</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowWorkers(false)}>×</Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingWorkers ? (
                  <p className="text-center text-muted-foreground py-4">Loading workers...</p>
                ) : workers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No available workers found at this location.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {workers.map((worker) => (
                      <div key={worker.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{worker.fullName}</h4>
                            <p className="text-sm text-muted-foreground">{worker.locationText}</p>
                          </div>
                          <div className="flex gap-2">
                            {worker.skillMatch > 0 && (
                              <Badge className="bg-green-600">{worker.skillMatch}% skill match</Badge>
                            )}
                            <Badge variant="outline">Score: {worker.reliabilityScore}/5</Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {worker.skills?.map((skill, i) => (
                            <Badge key={i} variant={worker.matchedSkills?.includes(skill) ? 'default' : 'outline'} className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Experience: {worker.experienceYears} years | Wage: ₹{worker.expectedWageMin}-{worker.expectedWageMax}/{worker.wageType}
                        </p>
<div className="mb-3">
                          {renderRoleSelect(browseJob, worker.id)}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleHire(browseJob, worker.id)}
                        >
                          Send Offer
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Applications Modal */}
        {showApps && appsJob && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Job Applications</CardTitle>
                    <CardDescription>For: {appsJob.title}</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowApps(false)}>×</Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingApplications ? (
                  <p className="text-center text-muted-foreground py-4">Loading applications...</p>
                ) : applications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No applications yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <div key={app.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{app.worker?.fullName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {app.worker?.locationText}
                              {app.worker?.skills?.length > 0 && ` • ${app.worker.skills.join(', ')}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Applied: {new Date(app.appliedAt).toLocaleDateString()}
                            </p>
                            {app.jobRole && (
                              <p className="text-xs text-blue-600">
                                Role: {app.jobRole.roleName}
                              </p>
                            )}
                          </div>
                          <Badge variant={app.status === 'PENDING' ? 'secondary' : app.status === 'OFFERED' ? 'outline' : app.status === 'OFFER_WITHDRAWN' ? 'secondary' : 'default'}>
                            {app.status === 'OFFERED' ? 'OFFER PENDING' : app.status === 'OFFER_WITHDRAWN' ? 'OFFER WITHDRAWN' : app.status}
                          </Badge>
                        </div>
                        {app.status === 'PENDING' && (
                          <div className="flex items-end gap-2 flex-wrap">
                            <div className="flex-1 min-w-[180px]">
                              {renderRoleSelect(appsJob, app.workerId, app.jobRoleId)}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAcceptApplication(appsJob, app.workerId, app.jobRoleId)}
                            >
                              Send Offer
                            </Button>
                          </div>
                        )}
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default EmployerDashboard;
