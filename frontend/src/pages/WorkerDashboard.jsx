import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const WorkerDashboard = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [location, setLocation] = useState('');
  const [wageMin, setWageMin] = useState('');
  const [wageMax, setWageMax] = useState('');
  const [wageType, setWageType] = useState('daily');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, jobsRes, appsRes] = await Promise.all([
        api.get('/worker/profile').catch(() => ({ data: { data: null } })),
        api.get('/worker/jobs').catch(() => ({ data: { data: [] } })),
        api.get('/worker/applications').catch(() => ({ data: { data: [] } }))
      ]);

      if (profileRes.data.data) {
        setProfile(profileRes.data.data);
        setFullName(profileRes.data.data.full_name || '');
        setSkills(profileRes.data.data.skills?.join(', ') || '');
        setExperience(profileRes.data.data.experience_years || '');
        setLocation(profileRes.data.data.location_text || '');
        setWageMin(profileRes.data.data.expected_wage_min || '');
        setWageMax(profileRes.data.data.expected_wage_max || '');
        setWageType(profileRes.data.data.wage_type || 'daily');
      }

      setJobs(jobsRes.data.data || []);
      setApplications(appsRes.data.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const profileData = {
        full_name: fullName,
        skills: skills.split(',').map(s => s.trim()).filter(s => s),
        experience_years: parseInt(experience) || 0,
        location_text: location,
        expected_wage_min: parseFloat(wageMin) || 0,
        expected_wage_max: parseFloat(wageMax) || 0,
        wage_type: wageType,
        availability: 'available'
      };

      const res = await api.put('/worker/profile', profileData);
      setProfile(res.data.data);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleApply = async (jobId) => {
    try {
      await api.post(`/worker/jobs/${jobId}/apply`);
      setSuccess('Application submitted!');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply');
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
            variant={activeTab === 'profile' ? 'default' : 'outline'}
            onClick={() => setActiveTab('profile')}
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
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your profile to get better job matches</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills (comma separated)</Label>
                    <Input
                      id="skills"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="plumbing, electrical, painting"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input
                      id="experience"
                      type="number"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      placeholder="5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Mumbai, Maharashtra"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wageMin">Min Expected Wage (₹)</Label>
                    <Input
                      id="wageMin"
                      type="number"
                      value={wageMin}
                      onChange={(e) => setWageMin(e.target.value)}
                      placeholder="500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wageMax">Max Expected Wage (₹)</Label>
                    <Input
                      id="wageMax"
                      type="number"
                      value={wageMax}
                      onChange={(e) => setWageMax(e.target.value)}
                      placeholder="800"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wageType">Wage Type</Label>
                    <select
                      id="wageType"
                      value={wageType}
                      onChange={(e) => setWageType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                    >
                      <option value="daily">Per Day</option>
                      <option value="hourly">Per Hour</option>
                      <option value="project">Per Project</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit">Save Profile</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Available Jobs</h2>
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No jobs available matching your skills right now.
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
                      <Badge>₹{job.wage_amount}/{job.wage_type}</Badge>
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
                        Workers needed: {job.workers_needed} | Duration: {job.duration_days} days
                      </span>
                      <Button onClick={() => handleApply(job.id)}>Apply</Button>
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
                        <CardDescription>{app.job?.location_text}</CardDescription>
                      </div>
                      <Badge variant={
                        app.status === 'hired' ? 'default' :
                        app.status === 'rejected' ? 'destructive' : 'secondary'
                      }>
                        {app.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        Applied: {new Date(app.applied_at).toLocaleDateString()}
                      </span>
                      {app.match_score && (
                        <span>Match Score: {app.match_score}%</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkerDashboard;
