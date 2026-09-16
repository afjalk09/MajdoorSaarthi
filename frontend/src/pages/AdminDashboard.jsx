import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/lib/toast';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'analytics') {
        const res = await api.get('/admin/analytics');
        setAnalytics(res.data.data);
      } else if (activeTab === 'verifications') {
        const res = await api.get('/admin/verifications');
        setVerifications(res.data.data || []);
      } else if (activeTab === 'workers') {
        const res = await api.get('/admin/workers');
        setWorkers(res.data.data || []);
      } else if (activeTab === 'jobs') {
        const res = await api.get('/admin/jobs');
        setJobs(res.data.data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (docId, status) => {
    try {
      await api.put(`/admin/verifications/${docId}`, { status });
      showSuccess(`Document ${status}`);
      fetchData();
    } catch (err) {
      showError('Failed to update verification');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" onClick={logout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-6">
          <Button variant={activeTab === 'analytics' ? 'default' : 'outline'} onClick={() => setActiveTab('analytics')}>Analytics</Button>
          <Button variant={activeTab === 'verifications' ? 'default' : 'outline'} onClick={() => setActiveTab('verifications')}>
            Verifications ({verifications.length})
          </Button>
          <Button variant={activeTab === 'workers' ? 'default' : 'outline'} onClick={() => setActiveTab('workers')}>Workers</Button>
          <Button variant={activeTab === 'jobs' ? 'default' : 'outline'} onClick={() => setActiveTab('jobs')}>Jobs</Button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            {/* Analytics Tab */}
            {activeTab === 'analytics' && analytics && (
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Workers</CardDescription>
                    <CardTitle className="text-3xl">{analytics.totalWorkers}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Employers</CardDescription>
                    <CardTitle className="text-3xl">{analytics.totalEmployers}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Jobs</CardDescription>
                    <CardTitle className="text-3xl">{analytics.totalJobs}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Completed Jobs</CardDescription>
                    <CardTitle className="text-3xl">{analytics.completedJobs}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Open Jobs</CardDescription>
                    <CardTitle className="text-3xl">{analytics.openJobs}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Revenue</CardDescription>
                    <CardTitle className="text-3xl">₹{analytics.totalPayments}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Platform Commission</CardDescription>
                    <CardTitle className="text-3xl">₹{analytics.totalCommission}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            )}

            {/* Verifications Tab */}
            {activeTab === 'verifications' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Pending Verifications</h2>
                {verifications.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No pending verifications.
                    </CardContent>
                  </Card>
                ) : (
                  verifications.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="py-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{doc.user?.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Document: {doc.doc_type.toUpperCase()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleVerify(doc.id, 'approved')}>
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleVerify(doc.id, 'rejected')}>
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Workers Tab */}
            {activeTab === 'workers' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">All Workers</h2>
                {workers.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No workers registered yet.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workers.map((worker) => (
                      <Card key={worker.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">{worker.full_name}</CardTitle>
                            <Badge variant={worker.is_verified ? 'default' : 'secondary'}>
                              {worker.is_verified ? 'Verified' : 'Unverified'}
                            </Badge>
                          </div>
                          <CardDescription>{worker.user?.email}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm space-y-1">
                            <p>Roles: {worker.roles?.join(', ') || 'None'}</p>
                            <p>Experience: {worker.experience_years} years</p>
                            <p>Reliability: {worker.reliability_score}/100</p>
                            <p>Wage: ₹{worker.expected_wage_min}-{worker.expected_wage_max}/{worker.wage_type}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Jobs Tab */}
            {activeTab === 'jobs' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">All Jobs</h2>
                {jobs.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No jobs posted yet.
                    </CardContent>
                  </Card>
                ) : (
                  jobs.map((job) => (
                    <Card key={job.id}>
                      <CardContent className="py-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{job.title}</h4>
                            <p className="text-sm text-muted-foreground">{job.location_text}</p>
                            <p className="text-sm">Employer: {job.employer?.display_name}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              job.status === 'open' ? 'default' :
                              job.status === 'completed' ? 'secondary' : 'outline'
                            }>
                              {job.status}
                            </Badge>
                            <p className="text-sm mt-1">₹{job.wage_amount}/{job.wage_type}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
