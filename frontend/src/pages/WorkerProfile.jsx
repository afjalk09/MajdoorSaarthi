import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/lib/toast';

const WorkerProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [fullName, setFullName] = useState('');
  const [roles, setRoles] = useState([]);
  const [customRole, setCustomRole] = useState('');
  const [roleList, setRoleList] = useState([]);
  const [experience, setExperience] = useState('');
  const [location, setLocation] = useState('');
  const [wageMin, setWageMin] = useState('');
  const [wageMax, setWageMax] = useState('');
  const [wageType, setWageType] = useState('DAILY');

  useEffect(() => {
    fetchProfile();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoleList(res.data.data || []);
    } catch (err) {
      console.error('Failed to load roles', err);
    }
  };

  const toggleRole = (roleName) => {
    setRoles(prev =>
      prev.includes(roleName)
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    );
  };

  const addCustomRole = () => {
    const name = customRole.trim();
    if (!name) return;
    if (!roles.includes(name)) {
      setRoles(prev => [...prev, name]);
    }
    setCustomRole('');
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/worker/profile');
      const p = res.data.data;
      setProfile(p);
      setFullName(p.fullName || '');
      setRoles(p.roles || []);
      setExperience(p.experienceYears || '');
      setLocation(p.locationText || '');
      setWageMin(p.expectedWageMin || '');
      setWageMax(p.expectedWageMax || '');
      setWageType(p.wageType || 'DAILY');
    } catch (err) {
      if (err.response?.status === 404) {
        setEditing(true);
      } else {
        showError(err.response?.data?.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      const res = await api.put('/worker/profile', {
        full_name: fullName,
        roles,
        experience_years: parseInt(experience) || 0,
        location_text: location,
        expected_wage_min: parseFloat(wageMin) || 0,
        expected_wage_max: parseFloat(wageMax) || 0,
        wage_type: wageType
      });
      setProfile(res.data.data);
      setEditing(false);
      showSuccess('Profile updated successfully');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFullName(profile.fullName || '');
      setRoles(profile.roles || []);
      setExperience(profile.experienceYears || '');
      setLocation(profile.locationText || '');
      setWageMin(profile.expectedWageMin || '');
      setWageMax(profile.expectedWageMax || '');
      setWageType(profile.wageType || 'DAILY');
    }
    setEditing(false);
  };

  const availabilityColors = {
    AVAILABLE: 'bg-green-100 text-green-800',
    BUSY: 'bg-yellow-100 text-yellow-800',
    UNAVAILABLE: 'bg-red-100 text-red-800'
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16">Loading...</div>;
  }

  return (
    <div>
      <main className="max-w-3xl mx-auto section-container py-8">
        {!editing ? (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{profile?.fullName || 'No Name Set'}</CardTitle>
                  <CardDescription>{user?.email} • {user?.phone}</CardDescription>
                </div>
                <Button onClick={() => setEditing(true)}>Edit Profile</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Full Name</p>
                  <p className="text-base">{profile?.fullName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Experience</p>
                  <p className="text-base">{profile?.experienceYears ? `${profile.experienceYears} years` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Location</p>
                  <p className="text-base">{profile?.locationText || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Availability</p>
                  <Badge className={availabilityColors[profile?.availability] || ''}>
                    {profile?.availability || '-'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Wage Range</p>
                  <p className="text-base">
                    ₹{profile?.expectedWageMin || 0} - ₹{profile?.expectedWageMax || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Wage Type</p>
                  <p className="text-base">{profile?.wageType || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Reliability Score</p>
                  <p className="text-base">{profile?.reliabilityScore || 0}/5.0</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Verified</p>
                  <Badge variant={profile?.isVerified ? 'default' : 'secondary'}>
                    {profile?.isVerified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </div>
              </div>

<div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {profile?.roles?.length > 0 ? (
                      profile.roles.map((role, i) => (
                        <Badge key={i} className="bg-green-100 text-green-800 hover:bg-green-100">{role}</Badge>
                      ))
                    ) : (
                      <p className="text-base text-muted-foreground">No roles selected</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Your role is used to rank matching jobs in your feed.
                  </p>
                </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{profile ? 'Edit Profile' : 'Create Profile'}</CardTitle>
              <CardDescription>
                {profile ? 'Update your profile information' : 'Complete your profile to start finding jobs'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Rahul Kumar"
                      required
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
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="New Delhi, India"
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
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wageMax">Max Expected Wage (₹)</Label>
                    <Input
                      id="wageMax"
                      type="number"
                      value={wageMax}
                      onChange={(e) => setWageMax(e.target.value)}
                      placeholder="1500"
                      min="0"
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
                </div>

                <div className="space-y-2">
                  <Label>Roles (select all that apply)</Label>
                  <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto rounded-md border p-3">
                    {roleList.length > 0 ? (
                      roleList.map(role => {
                        const active = roles.includes(role.name);
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => toggleRole(role.name)}
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                              active
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-foreground border-input hover:bg-accent'
                            }`}
                          >
                            {role.name}
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">Loading roles...</p>
                    )}
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Custom Role</Label>
                      <Input
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomRole(); } }}
                        placeholder="Type your own role..."
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={addCustomRole} className="shrink-0">
                      Add
                    </Button>
                  </div>
                  {roles.some(r => !roleList.some(t => t.name === r)) && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {roles.filter(r => !roleList.some(t => t.name === r)).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => toggleRole(r)}
                          className="inline-flex items-center rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-800 hover:bg-orange-100"
                        >
                          {r} ×
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Jobs matching your role are shown first in your feed.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  {profile && (
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit">Save Profile</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default WorkerProfile;
