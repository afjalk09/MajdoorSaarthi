import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/lib/toast';

const BrowseWorkers = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const jobId = searchParams.get('job_id');

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Role taxonomy dropdown
  const [roleOptions, setRoleOptions] = useState([]);

  // Job context for role selection
  const [job, setJob] = useState(null);

  // Role selection per worker
  const [hireRoles, setHireRoles] = useState({});

  const setHireRole = (workerId, roleId) => {
    setHireRoles(prev => ({ ...prev, [workerId]: roleId }));
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoleOptions(res.data.data || []);
    } catch (err) {
      // Non-critical — role filter won't show
    }
  };

  useEffect(() => {
    if (jobId) fetchJob();
  }, [jobId]);

  useEffect(() => {
    fetchWorkers();
  }, [page, jobId]);

  const fetchJob = async () => {
    try {
      const res = await api.get(`/jobs/${jobId}`);
      setJob(res.data.data || null);
    } catch (err) {
      showError('Failed to load job details');
    }
  };

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', 20);
      if (jobId) params.set('job_id', jobId);
      if (search.trim()) params.set('search', search.trim());
      if (role.trim()) params.set('role', role.trim());

      const res = await api.get(`/employer/workers?${params.toString()}`);
      setWorkers(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err) {
      showError('Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchWorkers();
  };

  const handleReset = () => {
    setSearch('');
    setRole('');
    setPage(1);
  };

  const effectiveRoleId = (workerId, suggestedId) => {
    if (hireRoles[workerId]) return hireRoles[workerId];
    if (!job) return undefined;
    const roles = (job.jobRoles || []).filter(r => (r.remainingCapacity ?? (r.count - (r.filledCount || 0))) > 0);
    if (suggestedId && roles.some(r => r.id === suggestedId)) return suggestedId;
    if (roles.length === 0) return undefined;
    return [...roles].sort((a, b) => {
      const ra = a.remainingCapacity ?? (a.count - (a.filledCount || 0));
      const rb = b.remainingCapacity ?? (b.count - (b.filledCount || 0));
      return rb - ra;
    })[0].id;
  };

  const renderRoleSelect = (workerId) => {
    if (!job) return null;
    const roles = (job.jobRoles || []).filter(r => (r.remainingCapacity ?? (r.count - (r.filledCount || 0))) > 0);
    if (roles.length === 0) {
      return <p className="text-xs text-red-500">No role has an available slot.</p>;
    }
    const value = effectiveRoleId(workerId);
    return (
      <select
        value={value || ''}
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

  const handleHire = async (workerId) => {
    if (!job) return;
    const roleId = effectiveRoleId(workerId);
    try {
      await api.post(`/jobs/${job.id}/hire/${workerId}`, { jobRoleId: roleId });
      setHireRoles(prev => ({ ...prev, [workerId]: undefined }));
      showSuccess('Offer sent — awaiting worker acceptance');
      fetchWorkers();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send offer');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">Browse Workers</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" onClick={logout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {job && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{job.title}</CardTitle>
              <CardDescription>{job.locationText} | {job.wageAmount}/{job.wageType} | {job.durationDays} days</CardDescription>
            </CardHeader>
            {job.jobRoles && job.jobRoles.length > 0 && (
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {job.jobRoles.map((r, i) => (
                    <Badge key={i} variant="secondary">
                      {r.roleName}: {r.filledCount || 0}/{r.count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleFilter} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-1">
                <Label htmlFor="search">Search by name</Label>
                <Input
                  id="search"
                  placeholder="Worker name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="role">Filter by role</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">All roles</option>
                  {roleOptions.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Filter</Button>
                <Button type="button" variant="outline" onClick={handleReset}>Reset</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading workers...</p>
        ) : workers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No workers found matching your criteria.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {workers.map((worker) => (
                <Card key={worker.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{worker.fullName}</h4>
                        <p className="text-sm text-muted-foreground">{worker.locationText}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {worker.isVerified && (
                          <Badge variant="outline" className="border-green-500 text-green-600">Verified</Badge>
                        )}
                        <Badge variant="outline">Score: {worker.reliabilityScore}/5</Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {(worker.roles || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mr-1">
                          {(worker.roles || []).map((r, i) => (
                            <Badge key={i} className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">{r}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      Experience: {worker.experienceYears} years | Wage: ₹{worker.expectedWageMin}-{worker.expectedWageMax}/{worker.wageType}
                    </p>

                    {job && (
                      <div className="flex flex-col sm:flex-row gap-3 items-start">
                        <div className="w-full sm:w-64">
                          {renderRoleSelect(worker.id)}
                        </div>
                        <Button size="sm" onClick={() => handleHire(worker.id)}>
                          Send Offer
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} workers
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2 py-1">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default BrowseWorkers;
