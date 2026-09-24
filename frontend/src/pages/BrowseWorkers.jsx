import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/lib/toast';
import { getWorkerImage, getRoleImage } from '@/lib/roleImages';
import { motion } from 'framer-motion';
import { MapPin, Star, BadgeCheck, Send, Wrench } from 'lucide-react';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';

const WorkerBanner = ({ worker }) => {
  const roles = worker?.roles || [];
  const primaryRole = roles[0];
  const img = getWorkerImage(worker);
  const [error, setError] = useState(false);
  const initials = (worker?.fullName || 'W')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-saffron-100 to-earth-100">
      {!error && img ? (
        <img
          src={img}
          alt={worker.fullName}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="font-display font-bold text-3xl text-saffron-600">{initials}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      {primaryRole && (
        <span className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-white font-display font-semibold text-sm truncate">
            <Wrench size={14} className="text-gold-300" />
            {primaryRole}
          </span>
        </span>
      )}
      <div className="absolute top-3 right-3">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-gold-300 text-xs font-semibold">
          <Star size={12} className="fill-gold-400 text-gold-400" />
          {worker.reliabilityScore || 0}/5
        </span>
      </div>
    </div>
  );
};

const BrowseWorkers = () => {
  const { user } = useAuth();
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
  const [myJobs, setMyJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Role selection per worker
  const [hireRoles, setHireRoles] = useState({});
  const [hiring, setHiring] = useState(null);

  const setHireRole = (workerId, roleId) => {
    setHireRoles(prev => ({ ...prev, [workerId]: roleId }));
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // Load the employer's own jobs so Send Offer works even without ?job_id=
  useEffect(() => {
    fetchMyJobs();
  }, []);

  const fetchMyJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await api.get('/jobs');
      const list = res.data.data || [];
      setMyJobs(list);
      if (!jobId && list.length > 0) {
        const active = list.find(j => j.status === 'OPEN' || j.status === 'IN_PROGRESS') || list[0];
        setSearchParams({ job_id: active.id }, { replace: true });
      }
    } catch (err) {
      console.error('Failed to load jobs', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleJobChange = (newJobId) => {
    setHireRoles({});
    setSearchParams(newJobId ? { job_id: newJobId } : {});
  };

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
        className="flex h-9 w-full rounded-md border border-warm-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-saffron-500"
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
    setHiring(workerId);
    try {
      await api.post(`/jobs/${job.id}/hire/${workerId}`, { jobRoleId: roleId });
      setHireRoles(prev => ({ ...prev, [workerId]: undefined }));
      showSuccess('Offer sent — awaiting worker acceptance');
      fetchWorkers();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send offer');
    } finally {
      setHiring(null);
    }
  };

  return (
    <div>
      <main className="section-container py-8">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-warm-900">Browse Workers</h1>
          <p className="text-warm-500 text-sm mt-1">
            {job ? `For job: ${job.title}` : 'Find skilled verified workers near you'}
          </p>

          {/* Job selector */}
          <div className="mt-4 max-w-md">
            <Label htmlFor="job-select" className="text-warm-700 text-sm">
              Select a job to send offers
            </Label>
            <select
              id="job-select"
              value={jobId || ''}
              onChange={(e) => handleJobChange(e.target.value)}
              className="mt-1.5 flex h-10 w-full rounded-md border border-warm-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-saffron-500"
            >
              <option value="" disabled>
                {loadingJobs ? 'Loading your jobs...' : 'Choose a job...'}
              </option>
              {myJobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.status === 'OPEN' ? 'Open' : j.status === 'IN_PROGRESS' ? 'In Progress' : 'Closed'})
                </option>
              ))}
              {!loadingJobs && myJobs.length === 0 && (
                <option value="" disabled>No jobs yet — create one first</option>
              )}
            </select>
            {!job && myJobs.length > 0 && (
              <p className="text-xs text-warm-500 mt-1.5">
                Pick a job above to enable hiring.
              </p>
            )}
          </div>
        </div>

        {job && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{job.title}</CardTitle>
              <CardDescription>
                {job.locationText} | ₹{job.wageAmount}/{job.wageType} | {job.durationDays} days
              </CardDescription>
            </CardHeader>
            {job.jobRoles && job.jobRoles.length > 0 && (
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {job.jobRoles.map((r, i) => (
                    <Badge key={i} variant="secondary">
                      <img
                        src={getRoleImage(r.roleName)}
                        alt={r.roleName}
                        className="w-3.5 h-3.5 rounded-full object-cover mr-1"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
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
                <Label htmlFor="search" className="text-warm-700">Search by name</Label>
                <Input
                  id="search"
                  placeholder="Worker name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-white border-warm-200"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="role" className="text-warm-700">Filter by role</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-warm-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-saffron-500"
                >
                  <option value="">All roles</option>
                  {roleOptions.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-gradient-to-r from-saffron-500 to-saffron-600 hover:from-saffron-600 hover:to-saffron-700 text-white shadow-md">
                  Filter
                </Button>
                <Button type="button" variant="outline" onClick={handleReset} className="border-warm-200">
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <DashboardSkeleton />
        ) : workers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No workers found matching your criteria.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {workers.map((worker, idx) => (
                <motion.div
                  key={worker.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.4) }}
                  className="h-full"
                >
                  <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 h-full flex flex-col overflow-hidden">
                    {/* Role-aligned worker image banner */}
                    <WorkerBanner worker={worker} />

                    {/* Worker info */}
                    <CardContent className="p-5 flex-1 flex flex-col pt-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-display font-semibold text-lg text-warm-900 truncate">
                          {worker.fullName}
                        </h4>
                        {worker.isVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-earth-50 text-earth-600 text-xs font-medium border border-earth-200/60 shrink-0">
                            <BadgeCheck size={12} />
                            Verified
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-warm-500 flex items-center gap-1 mb-2.5">
                        <MapPin size={13} className="text-saffron-500 shrink-0" />
                        <span className="truncate">{worker.locationText || 'Location not set'}</span>
                      </p>

                      {/* Role chips */}
                      {(worker.roles || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {worker.roles.map((r, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-saffron-50 text-saffron-600 text-xs font-medium border border-saffron-100"
                            >
                              <img
                                src={getRoleImage(r)}
                                alt=""
                                className="w-3.5 h-3.5 rounded-full object-cover"
                                onError={e => { e.currentTarget.style.display = 'none'; }}
                              />
                              {r}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-sm text-warm-500 mb-3">
                        <span className="font-medium text-warm-700">
                          {worker.experienceYears || 0} yrs exp
                        </span>{' '}
                        | Wage: ₹{worker.expectedWageMin}-{worker.expectedWageMax}/{worker.wageType}
                      </p>

                      {job && (
                        <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-warm-100">
                          {renderRoleSelect(worker.id)}
                          <Button
                            size="sm"
                            onClick={() => handleHire(worker.id)}
                            disabled={hiring === worker.id || !effectiveRoleId(worker.id)}
                            className="w-full bg-gradient-to-r from-earth-500 to-earth-600 hover:from-earth-600 hover:to-earth-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                          >
                            {hiring === worker.id ? (
                              <span className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Sending...
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5">
                                <Send size={14} />
                                Send Offer
                              </span>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
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
                    className="border-warm-200"
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
                    className="border-warm-200"
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