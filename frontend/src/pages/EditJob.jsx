import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/lib/toast';

const EditJob = () => {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [wageAmount, setWageAmount] = useState('');
  const [wageType, setWageType] = useState('DAILY');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [roleRequirements, setRoleRequirements] = useState([
    { roleName: '', skills: '', count: 1 }
  ]);

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const res = await api.get(`/jobs/${id}`);
      const job = res.data.data;

      if (job.status !== 'OPEN') {
        showError('Can only edit open jobs');
        setTimeout(() => navigate('/dashboard'), 1500);
        return;
      }

      setTitle(job.title || '');
      setDescription(job.description || '');
      setLocation(job.locationText || '');
      setWageAmount(job.wageAmount || '');
      setWageType(job.wageType || 'DAILY');
      setDuration(job.durationDays || '');
      setStartDate(job.startDate ? job.startDate.slice(0, 10) : '');
      setEndDate(job.endDate ? job.endDate.slice(0, 10) : '');
      setStartTime(job.startTime || '');
      setEndTime(job.endTime || '');

      // Load existing role requirements
      if (job.jobRoles && job.jobRoles.length > 0) {
        setRoleRequirements(job.jobRoles.map(r => ({
          roleName: r.roleName,
          skills: r.skills?.join(', ') || '',
          count: r.count
        })));
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to load job');
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const roleReqs = roleRequirements
      .filter(r => r.roleName.trim())
      .map(r => ({
        roleName: r.roleName.trim(),
        skills: r.skills.split(',').map(s => s.trim()).filter(s => s),
        count: parseInt(r.count) || 1
      }));

    if (roleReqs.length === 0) {
      showError('Add at least one role with a name');
      setSaving(false);
      return;
    }

    try {
      await api.put(`/jobs/${id}`, {
        title,
        description,
        role_requirements: roleReqs,
        location_text: location,
        wage_amount: parseFloat(wageAmount),
        wage_type: wageType,
        duration_days: parseInt(duration) || null,
        start_date: startDate || null,
        end_date: endDate || null,
        start_time: startTime || null,
        end_time: endTime || null
      });
      showSuccess('Job updated successfully');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              ← Back
            </Button>
            <h1 className="text-2xl font-bold text-green-600">Edit Job</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" onClick={logout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Edit Job Details</CardTitle>
            <CardDescription>Update the job posting and role requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Building renovation work"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Andheri, Mumbai"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the job requirements..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wageAmount">Wage Amount (₹)</Label>
                  <Input
                    id="wageAmount"
                    type="number"
                    value={wageAmount}
                    onChange={(e) => setWageAmount(e.target.value)}
                    placeholder="500"
                    required
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
                    <option value="DAILY">Per Day</option>
                    <option value="HOURLY">Per Hour</option>
                    <option value="PROJECT">Per Project</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (days)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
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

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EditJob;
