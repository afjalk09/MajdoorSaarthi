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

const EmployerProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [employerType, setEmployerType] = useState('INDIVIDUAL');
  const [displayName, setDisplayName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [location, setLocation] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [companyRegNumber, setCompanyRegNumber] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/employer/profile');
      const p = res.data.data;
      setProfile(p);
      setEmployerType(p.employerType || 'INDIVIDUAL');
      setDisplayName(p.displayName || '');
      setContactPerson(p.contactPerson || '');
      setLocation(p.locationText || '');
      setAadhaarNumber(p.aadhaarNumber || '');
      setPanNumber(p.panNumber || '');
      setCompanyRegNumber(p.companyRegNumber || '');
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
      const res = await api.put('/employer/profile', {
        employer_type: employerType,
        display_name: displayName,
        contact_person: contactPerson,
        location_text: location,
        aadhaar_number: aadhaarNumber || null,
        pan_number: panNumber || null,
        company_reg_number: companyRegNumber || null
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
      setEmployerType(profile.employerType || 'INDIVIDUAL');
      setDisplayName(profile.displayName || '');
      setContactPerson(profile.contactPerson || '');
      setLocation(profile.locationText || '');
      setAadhaarNumber(profile.aadhaarNumber || '');
      setPanNumber(profile.panNumber || '');
      setCompanyRegNumber(profile.companyRegNumber || '');
    }
    setEditing(false);
  };

  const employerTypeLabels = {
    INDIVIDUAL: 'Individual',
    CONTRACTOR: 'Contractor',
    COMPANY: 'Company'
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
                  <CardTitle className="text-xl">{profile?.displayName || 'No Name Set'}</CardTitle>
                  <CardDescription>{user?.email} • {user?.phone}</CardDescription>
                </div>
                <Button onClick={() => setEditing(true)}>Edit Profile</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Account Type</p>
                  <Badge variant="secondary">
                    {employerTypeLabels[profile?.employerType] || profile?.employerType}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Display Name</p>
                  <p className="text-base">{profile?.displayName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Contact Person</p>
                  <p className="text-base">{profile?.contactPerson || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Location</p>
                  <p className="text-base">{profile?.locationText || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Aadhaar Number</p>
                  <p className="text-base">{profile?.aadhaarNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">PAN Number</p>
                  <p className="text-base">{profile?.panNumber || '-'}</p>
                </div>
                {profile?.employerType === 'COMPANY' && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Company Registration</p>
                    <p className="text-base">{profile?.companyRegNumber || '-'}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Verified</p>
                  <Badge variant={profile?.isVerified ? 'default' : 'secondary'}>
                    {profile?.isVerified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{profile ? 'Edit Profile' : 'Create Profile'}</CardTitle>
              <CardDescription>
                {profile ? 'Update your employer profile' : 'Complete your profile to start posting jobs'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <select
                      value={employerType}
                      onChange={(e) => setEmployerType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                    >
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="CONTRACTOR">Contractor</option>
                      <option value="COMPANY">Company</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name or company name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Person</Label>
                    <Input
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="Contact person name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Mumbai, Maharashtra"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Aadhaar Number</Label>
                    <Input
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value)}
                      placeholder="1234 5678 9012"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>PAN Number</Label>
                    <Input
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value)}
                      placeholder="ABCDE1234F"
                    />
                  </div>

                  {employerType === 'COMPANY' && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Company Registration Number</Label>
                      <Input
                        value={companyRegNumber}
                        onChange={(e) => setCompanyRegNumber(e.target.value)}
                        placeholder="U12345MH2020PTC123456"
                      />
                    </div>
                  )}
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

export default EmployerProfile;
