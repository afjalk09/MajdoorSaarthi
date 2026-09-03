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

const WorkerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('jobs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

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
        </div>

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
                        <CardDescription>
                          {job.locationText}
                          {job.distance != null && ` • ${job.distance.toFixed(1)} km away`}
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
                      {(app.status === 'HIRED' || app.status === 'PENDING') && app.job?.status === 'IN_PROGRESS' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/jobs/${app.jobId}/track`)}>
                            Track Job
                          </Button>
                          <DisputeForm jobId={app.jobId} onDisputeRaised={fetchData} />
                        </>
                      )}
                      {app.job?.status === 'COMPLETED' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/jobs/${app.jobId}/track`)}>
                            View Details
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
      </main>
    </div>
  );
};

export default WorkerDashboard;
