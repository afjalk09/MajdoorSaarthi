import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const EmployerDashboard = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile form
  const [employerType, setEmployerType] = useState('individual');
  const [displayName, setDisplayName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [location, setLocation] = useState('');

  // Job form
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobSkills, setJobSkills] = useState('');
  const [workersNeeded, setWorkersNeeded] = useState('1');
  const [jobLocation, setJobLocation] = useState('');
  const [wageAmount, setWageAmount] = useState('');
  const [wageType, setWageType] = useState('daily');
  const [duration, setDuration] = useState('');

  // Match modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [matches, setMatches] = useState([]);
  const [showMatches, setShowMatches] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, jobsRes] = await Promise.all([
        api.get('/employer/profile').catch(() => ({ data: { data: null } })),
        api.get('/jobs').catch(() => ({ data: { data: [] } }))
      ]);

      if (profileRes.data.data) {
        setProfile(profileRes.data.data);
        setEmployerType(profileRes.data.data.employer_type || 'individual');
        setDisplayName(profileRes.data.data.display_name || '');
        setContactPerson(profileRes.data.data.contact_person || '');
        setLocation(profileRes.data.data.location_text || '');
      }

      setJobs(jobsRes.data.data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await api.put('/employer/profile', {
        employer_type: employerType,
        display_name: displayName,
        contact_person: contactPerson,
        location_text: location
      });
      setProfile(res.data.data);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.post('/jobs', {
        title: jobTitle,
        description: jobDesc,
        required_skills: jobSkills.split(',').map(s => s.trim()).filter(s => s),
        workers_needed: parseInt(workersNeeded) || 1,
        location_text: jobLocation,
        wage_amount: parseFloat(wageAmount),
        wage_type: wageType,
        duration_days: parseInt(duration) || null
      });
      setSuccess('Job created successfully');
      setJobTitle('');
      setJobDesc('');
      setJobSkills('');
      setWorkersNeeded('1');
      setJobLocation('');
      setWageAmount('');
      setDuration('');
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

  const handleHire = async (jobId, workerId) => {
    try {
      await api.post(`/jobs/${jobId}/hire/${workerId}`);
      setSuccess('Worker hired successfully!');
      setShowMatches(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to hire worker');
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">Employer Dashboard</h1>
          <div className="flex items-center gap-4">
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
          <Button variant={activeTab === 'profile' ? 'default' : 'outline'} onClick={() => setActiveTab('profile')}>Profile</Button>
          <Button variant={activeTab === 'create' ? 'default' : 'outline'} onClick={() => setActiveTab('create')}>Create Job</Button>
          <Button variant={activeTab === 'jobs' ? 'default' : 'outline'} onClick={() => setActiveTab('jobs')}>My Jobs</Button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your employer profile</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <select
                      value={employerType}
                      onChange={(e) => setEmployerType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                    >
                      <option value="individual">Individual</option>
                      <option value="contractor">Contractor</option>
                      <option value="company">Company</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name or company name" />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Person (for companies)</Label>
                    <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Contact person name" />
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Mumbai, Maharashtra" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit">Save Profile</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Create Job Tab */}
        {activeTab === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>Post a New Job</CardTitle>
              <CardDescription>Describe the work you need done</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateJob} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Plumbing work" required />
                  </div>

                  <div className="space-y-2">
                    <Label>Workers Needed</Label>
                    <Input type="number" value={workersNeeded} onChange={(e) => setWorkersNeeded(e.target.value)} min="1" />
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
                    <Label>Required Skills (comma separated)</Label>
                    <Input value={jobSkills} onChange={(e) => setJobSkills(e.target.value)} placeholder="plumbing, pipe fitting" />
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={jobLocation} onChange={(e) => setJobLocation(e.target.value)} placeholder="Andheri, Mumbai" />
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
                      <option value="daily">Per Day</option>
                      <option value="hourly">Per Hour</option>
                      <option value="project">Per Project</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (days)</Label>
                    <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="5" />
                  </div>
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
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  You haven't posted any jobs yet.
                </CardContent>
              </Card>
            ) : (
              jobs.map((job) => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{job.title}</CardTitle>
                        <CardDescription>{job.location_text}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge>₹{job.wage_amount}/{job.wage_type}</Badge>
                        <Badge variant={
                          job.status === 'open' ? 'default' :
                          job.status === 'completed' ? 'secondary' : 'outline'
                        }>
                          {job.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{job.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.required_skills?.map((skill, i) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Workers: {job.workers_needed} | Duration: {job.duration_days} days
                      </span>
                      <div className="flex gap-2">
                        {job.status === 'open' && (
                          <>
                            <Button variant="outline" onClick={() => handleGetMatches(job)}>
                              Find Workers
                            </Button>
                            <Button variant="destructive" onClick={() => handleStatusUpdate(job.id, 'cancelled')}>
                              Cancel
                            </Button>
                          </>
                        )}
                        {job.status === 'in_progress' && (
                          <Button onClick={() => handleStatusUpdate(job.id, 'completed')}>
                            Mark Completed
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
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
                            <p className="text-sm text-muted-foreground">{match.location_text} • {match.distance} km away</p>
                          </div>
                          <Badge className="bg-green-600">{match.match_score}% match</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {match.skills?.map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                          ))}
                        </div>
                        <ul className="text-xs text-muted-foreground mb-3">
                          {match.match_reasons?.map((reason, i) => (
                            <li key={i}>• {reason}</li>
                          ))}
                        </ul>
                        <Button size="sm" onClick={() => handleHire(selectedJob.id, match.worker_id)}>
                          Hire Worker
                        </Button>
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
