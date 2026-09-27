import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  BadgeCheck,
  Landmark,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import FileUpload from '@/components/FileUpload';
import { showSuccess, showError } from '@/lib/toast';
import {
  ADDRESS_PROOF_OPTIONS,
  ADDRESS_PROOF_TYPES,
  ENTITY_TYPE_OPTIONS,
  REQUIRED_BUSINESS_DOC_TYPES,
  isBusinessType,
  isDocumentOnFile,
  docTypeLabel
} from '@/lib/docTypes';

const EMPLOYER_TYPES = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'COMPANY', label: 'Company' }
];

const EMPLOYER_TYPE_LABELS = {
  INDIVIDUAL: 'Individual',
  CONTRACTOR: 'Contractor',
  COMPANY: 'Company'
};

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_RE = /^\d{12}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const PINCODE_RE = /^\d{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const digitsOnly = (value) => (value || '').replace(/\D/g, '');

/** Masks all but the last 4 digits of an Aadhaar number for display */
const maskAadhaar = (value) => {
  const digits = digitsOnly(value);
  if (digits.length !== 12) return value || '-';
  return `XXXX XXXX ${digits.slice(-4)}`;
};

const SectionHeading = ({ icon: Icon, title, description }) => (
  <div className="mb-4 flex items-start gap-3">
    <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  </div>
);

const DocumentRow = ({ doc }) => {
  const variants = { PENDING: 'secondary', APPROVED: 'default', REJECTED: 'destructive' };
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{docTypeLabel(doc.docType)}</p>
        <p className="truncate text-xs text-muted-foreground">{doc.fileName || 'Document'}</p>
      </div>
      <Badge variant={variants[doc.status] || 'secondary'}>{doc.status}</Badge>
    </div>
  );
};

const EmployerProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // base fields
  const [employerType, setEmployerType] = useState('INDIVIDUAL');
  const [displayName, setDisplayName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [location, setLocation] = useState('');
  const [companyRegNumber, setCompanyRegNumber] = useState('');

  // required for every account type
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPincode, setAddressPincode] = useState('');

  // business block (contractor / company)
  const [legalBusinessName, setLegalBusinessName] = useState('');
  const [entityType, setEntityType] = useState('');
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryDesignation, setSignatoryDesignation] = useState('');
  const [signatoryMobile, setSignatoryMobile] = useState('');
  const [signatoryEmail, setSignatoryEmail] = useState('');
  const [addressProofType, setAddressProofType] = useState('');

  // newly picked files, keyed by doc type (address proof keyed by its chosen type)
  const [files, setFiles] = useState({});

  const isBusiness = isBusinessType(employerType);

  const loadDocuments = useCallback(async () => {
    try {
      const res = await api.get('/employer/documents');
      setDocuments(res.data.data || []);
    } catch {
      setDocuments([]);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, []);

  const applyProfileToForm = (p) => {
    setEmployerType(p.employerType || 'INDIVIDUAL');
    setDisplayName(p.displayName || '');
    setContactPerson(p.contactPerson || '');
    setContactMobile(p.contactMobile || '');
    setLocation(p.locationText || '');
    setCompanyRegNumber(p.companyRegNumber || '');
    setLegalBusinessName(p.legalBusinessName || '');
    setEntityType(p.entityType || '');
    setSignatoryName(p.signatoryName || '');
    setSignatoryDesignation(p.signatoryDesignation || '');
    setSignatoryMobile(p.signatoryMobile || '');
    setSignatoryEmail(p.signatoryEmail || '');
    setPanNumber(p.panNumber || '');
    setAadhaarNumber(p.aadhaarNumber || '');
    setAddressLine1(p.registeredAddressLine1 || '');
    setAddressLine2(p.registeredAddressLine2 || '');
    setAddressCity(p.registeredAddressCity || '');
    setAddressState(p.registeredAddressState || '');
    setAddressPincode(p.registeredAddressPincode || '');
    setAddressProofType(p.addressProofDocType || '');
    setFiles({});
    setFieldErrors({});
  };

  const loadProfile = async () => {
    try {
      const res = await api.get('/employer/profile');
      setProfile(res.data.data);
      applyProfileToForm(res.data.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setEditing(true);
      } else {
        showError(err.response?.data?.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
    loadDocuments();
  };

  /** Documents already on file, keyed by doc type (rejected ones are ignored) */
  const existingByType = useMemo(() => {
    const map = {};
    for (const doc of documents) {
      if (!isDocumentOnFile(doc)) continue;
      if (!map[doc.docType]) map[doc.docType] = doc;
    }
    return map;
  }, [documents]);

  const rejectedDocs = useMemo(() => documents.filter((d) => d.status === 'REJECTED'), [documents]);

  const onFileAddressProof = ADDRESS_PROOF_TYPES.find((t) => files[t]);
  const hasAddressProofDoc =
    Boolean(onFileAddressProof) || ADDRESS_PROOF_TYPES.some((t) => existingByType[t]);

  // PAN + Aadhaar are mandatory for everyone; a business employer also needs an
  // address proof. Kept in sync with REQUIRED_BUSINESS_DOC_TYPES on the backend.
  const requiredDocTypes = isBusiness
    ? [...REQUIRED_BUSINESS_DOC_TYPES]
    : ['PAN', 'AADHAAR'];

  const validate = () => {
    const errors = {};

    if (!displayName.trim()) errors.display_name = 'Display name is required';
    if (!MOBILE_RE.test(digitsOnly(contactMobile))) {
      errors.contact_mobile = 'Enter a valid 10-digit mobile number';
    }

    // required for every account type
    if (!PAN_RE.test(panNumber.trim().toUpperCase())) errors.pan_number = 'Enter a valid PAN (e.g. ABCDE1234F)';
    if (!AADHAAR_RE.test(digitsOnly(aadhaarNumber))) {
      errors.aadhaar_number = 'Enter a valid 12-digit Aadhaar number';
    }
    if (!addressLine1.trim()) errors.registered_address_line1 = 'Registered address is required';
    if (!addressCity.trim()) errors.registered_address_city = 'City is required';
    if (!addressState.trim()) errors.registered_address_state = 'State is required';
    if (!PINCODE_RE.test(addressPincode.trim())) errors.registered_address_pincode = 'Enter a valid 6-digit PIN code';

    for (const type of requiredDocTypes) {
      if (!existingByType[type] && !files[type]) {
        errors[type.toLowerCase()] = `${docTypeLabel(type)} upload is required`;
      }
    }

    if (isBusiness) {
      if (!legalBusinessName.trim()) errors.legal_business_name = 'Legal Business Name is required';
      if (!entityType) errors.entity_type = 'Select an entity type';
      if (!signatoryName.trim()) errors.signatory_name = 'Signatory full name is required';
      if (!signatoryDesignation.trim()) errors.signatory_designation = 'Designation is required';
      if (!MOBILE_RE.test(digitsOnly(signatoryMobile))) {
        errors.signatory_mobile = 'Enter a valid 10-digit mobile number';
      }
      if (!EMAIL_RE.test(signatoryEmail.trim())) errors.signatory_email = 'Enter a valid email address';
      if (!addressProofType) errors.address_proof_type = 'Select the type of address proof';

      if (!hasAddressProofDoc) {
        errors.address_proof_doc = 'Upload one registered address proof document';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadDocument = async (docType, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    if (docType === 'PAN') formData.append('doc_number', panNumber.trim().toUpperCase());
    if (docType === 'AADHAAR') formData.append('doc_number', digitsOnly(aadhaarNumber));

    // Content-Type is overridden so axios sets the multipart boundary
    const res = await api.post('/employer/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.data;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) {
      showError('Please fix the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      // Uploads go first so the backend sees the documents when it validates the profile
      const uploads = [];
      for (const type of requiredDocTypes) {
        if (files[type]) uploads.push(uploadDocument(type, files[type]));
      }
      if (onFileAddressProof) uploads.push(uploadDocument(onFileAddressProof, files[onFileAddressProof]));

      if (uploads.length) {
        const settled = await Promise.allSettled(uploads);
        const failed = settled.filter((r) => r.status === 'rejected');
        if (failed.length) {
          const reason = failed[0].reason?.response?.data?.message || 'One or more files could not be uploaded';
          showError(reason);
          setSaving(false);
          await loadDocuments();
          return;
        }
      }

      const payload = {
        employer_type: employerType,
        display_name: displayName.trim(),
        contact_person: contactPerson.trim() || null,
        contact_mobile: digitsOnly(contactMobile),
        location_text: location.trim() || null,
        // required for every account type
        pan_number: panNumber.trim().toUpperCase(),
        aadhaar_number: digitsOnly(aadhaarNumber),
        registered_address_line1: addressLine1.trim(),
        registered_address_line2: addressLine2.trim() || null,
        registered_address_city: addressCity.trim(),
        registered_address_state: addressState.trim(),
        registered_address_pincode: addressPincode.trim()
      };

      if (isBusiness) {
        Object.assign(payload, {
          legal_business_name: legalBusinessName.trim(),
          entity_type: entityType,
          signatory_name: signatoryName.trim(),
          signatory_designation: signatoryDesignation.trim(),
          signatory_mobile: digitsOnly(signatoryMobile),
          signatory_email: signatoryEmail.trim()
        });
      }

      if (employerType === 'COMPANY') {
        payload.company_reg_number = companyRegNumber.trim() || null;
      }

      const res = await api.put('/employer/profile', payload);

      setProfile(res.data.data);
      applyProfileToForm(res.data.data);
      await loadDocuments();
      setEditing(false);
      showSuccess('Profile updated successfully');
    } catch (err) {
      const details = err.response?.data?.fields;
      if (Array.isArray(details) && details.length) {
        setFieldErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
      }
      showError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      applyProfileToForm(profile);
    }
    setEditing(false);
  };

  const fieldError = (key) => (fieldErrors[key] ? <p className="text-xs font-medium text-destructive">{fieldErrors[key]}</p> : null);

  if (loading) {
    return <div className="flex items-center justify-center py-16">Loading...</div>;
  }

  return (
    <main className="max-w-4xl mx-auto section-container py-8">
      {!editing ? (
        <div className="space-y-6">
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
                    {EMPLOYER_TYPE_LABELS[profile?.employerType] || profile?.employerType}
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
                  <p className="text-sm font-medium text-muted-foreground mb-1">Contact Number</p>
                  <p className="text-base">{profile?.contactMobile || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Location</p>
                  <p className="text-base">{profile?.locationText || '-'}</p>
                </div>
                {profile?.employerType === 'COMPANY' && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Company Registration</p>
                    <p className="text-base">{profile?.companyRegNumber || '-'}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Verification</p>
                  <Badge variant={profile?.isVerified ? 'default' : 'secondary'}>
                    {profile?.isVerified ? (
                      <>
                        <BadgeCheck className="mr-1 h-3.5 w-3.5" /> Verified
                      </>
                    ) : !profile?.profileComplete ? (
                      <>
                        <ShieldAlert className="mr-1 h-3.5 w-3.5" /> Details incomplete
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Pending review
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {isBusinessType(profile?.employerType) && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-4 w-4 text-primary" /> Business Details
                  </CardTitle>
                  <CardDescription>As registered on your official tax documents</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Legal Business Name</p>
                    <p className="text-base">{profile?.legalBusinessName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Entity Type</p>
                    <p className="text-base">
                      {ENTITY_TYPE_OPTIONS.find((o) => o.value === profile?.entityType)?.label || '-'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BadgeCheck className="h-4 w-4 text-primary" /> Authorized Signatory
                  </CardTitle>
                  <CardDescription>Primary account manager for this business</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Full Name</p>
                    <p className="text-base">{profile?.signatoryName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Designation</p>
                    <p className="text-base">{profile?.signatoryDesignation || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Mobile</p>
                    <p className="text-base">{profile?.signatoryMobile || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                    <p className="text-base">{profile?.signatoryEmail || '-'}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Landmark className="h-4 w-4 text-primary" /> PAN &amp; Aadhaar
              </CardTitle>
              <CardDescription>As printed on your PAN card and Aadhaar</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">PAN Number</p>
                <p className="text-base font-mono">{profile?.panNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Aadhaar Number</p>
                <p className="text-base font-mono">{maskAadhaar(profile?.aadhaarNumber)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Landmark className="h-4 w-4 text-primary" /> Registered Address
              </CardTitle>
              <CardDescription>
                {profile?.addressProofDocType
                  ? `Proof on file: ${docTypeLabel(profile.addressProofDocType)}`
                  : isBusinessType(profile?.employerType)
                    ? 'No address proof on file'
                    : 'Address registered on your PAN and Aadhaar'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-base">
              <p>{profile?.registeredAddressLine1 || '-'}</p>
              {profile?.registeredAddressLine2 && <p>{profile.registeredAddressLine2}</p>}
              <p>
                {[profile?.registeredAddressCity, profile?.registeredAddressState, profile?.registeredAddressPincode]
                  .filter(Boolean)
                  .join(', ') || '-'}
              </p>
            </CardContent>
          </Card>

          {documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Verification Documents
                </CardTitle>
                <CardDescription>Reviewed by our team before you can post jobs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {documents.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6" noValidate>
          <Card>
            <CardHeader>
              <CardTitle>{profile ? 'Edit Profile' : 'Create Profile'}</CardTitle>
              <CardDescription>
                {profile
                  ? 'Update your employer profile'
                  : 'Complete your profile to start posting jobs'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employerType">Account Type</Label>
                  <Select value={employerType} onValueChange={setEmployerType}>
                    <SelectTrigger id="employerType">
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYER_TYPES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Name shown to workers on your jobs"
                  />
                  {fieldError('display_name')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Contact person name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactMobile">
                    Contact Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contactMobile"
                    type="tel"
                    inputMode="numeric"
                    value={contactMobile}
                    onChange={(e) => setContactMobile(digitsOnly(e.target.value))}
                    placeholder="98765 43210"
                    maxLength={10}
                  />
                  {fieldError('contact_mobile')}
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

                {employerType === 'COMPANY' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="companyRegNumber">Company Registration Number</Label>
                    <Input
                      id="companyRegNumber"
                      value={companyRegNumber}
                      onChange={(e) => setCompanyRegNumber(e.target.value.toUpperCase())}
                      placeholder="U12345MH2020PTC123456"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {isBusiness && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <SectionHeading
                    icon={Building2}
                    title="Legal Business Details"
                    description="The name and entity type registered on your official tax documents"
                  />
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="legalBusinessName">
                        Legal Business Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="legalBusinessName"
                        value={legalBusinessName}
                        onChange={(e) => setLegalBusinessName(e.target.value)}
                        placeholder="As per your PAN / GST registration"
                      />
                      {fieldError('legal_business_name')}
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Entity Type <span className="text-destructive">*</span>
                      </Label>
                      <Select value={entityType} onValueChange={setEntityType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTITY_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldError('entity_type')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <SectionHeading
                    icon={BadgeCheck}
                    title="Authorized Signatory"
                    description="The primary account manager authorised to act for this business"
                  />
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signatoryName">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="signatoryName"
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                        placeholder="Full name of the signatory"
                      />
                      {fieldError('signatory_name')}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signatoryDesignation">
                        Designation <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="signatoryDesignation"
                        value={signatoryDesignation}
                        onChange={(e) => setSignatoryDesignation(e.target.value)}
                        placeholder="Proprietor / Managing Partner / Director"
                      />
                      {fieldError('signatory_designation')}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signatoryMobile">
                        Mobile <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="signatoryMobile"
                        type="tel"
                        inputMode="numeric"
                        value={signatoryMobile}
                        onChange={(e) => setSignatoryMobile(e.target.value.replace(/[^\d+ ]/g, ''))}
                        placeholder="98765 43210"
                      />
                      {fieldError('signatory_mobile')}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signatoryEmail">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="signatoryEmail"
                        type="email"
                        value={signatoryEmail}
                        onChange={(e) => setSignatoryEmail(e.target.value)}
                        placeholder="signatory@business.com"
                      />
                      {fieldError('signatory_email')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardContent className="pt-6">
              <SectionHeading
                icon={Landmark}
                title="PAN Card & Aadhaar"
                description="Your PAN card and Aadhaar, both verified against the documents you upload"
              />
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="panNumber">
                    PAN Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="panNumber"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className="font-mono"
                  />
                  {fieldError('pan_number')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aadhaarNumber">
                    Aadhaar Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="aadhaarNumber"
                    inputMode="numeric"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(digitsOnly(e.target.value))}
                    placeholder="123456789012"
                    maxLength={12}
                    className="font-mono"
                  />
                  {fieldError('aadhaar_number')}
                </div>
              </div>

              <Separator className="my-5" />

              <div className="grid md:grid-cols-2 gap-5">
                <FileUpload
                  id="panFile"
                  label="PAN Card"
                  description="Scan or photo of your PAN card"
                  required
                  file={files.PAN}
                  existing={existingByType.PAN}
                  onSelect={(f) => setFiles((prev) => ({ ...prev, PAN: f || undefined }))}
                  error={fieldErrors.pan}
                />
                <FileUpload
                  id="aadhaarFile"
                  label="Aadhaar"
                  description="Your Aadhaar (front & back on one page)"
                  required
                  file={files.AADHAAR}
                  existing={existingByType.AADHAAR}
                  onSelect={(f) => setFiles((prev) => ({ ...prev, AADHAAR: f || undefined }))}
                  error={fieldErrors.aadhaar}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <SectionHeading
                icon={Landmark}
                title={isBusiness ? 'Registered Address & Proof' : 'Registered Address'}
                description={
                  isBusiness
                    ? 'Your office address along with a document that proves it'
                    : 'The address registered on your PAN and Aadhaar'
                }
              />
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressLine1">
                    Address Line 1 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="addressLine1"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Office / shop number, building name"
                  />
                  {fieldError('registered_address_line1')}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Street, area (optional)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressCity">
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="addressCity"
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    placeholder="Mumbai"
                  />
                  {fieldError('registered_address_city')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressState">
                    State <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="addressState"
                    value={addressState}
                    onChange={(e) => setAddressState(e.target.value)}
                    placeholder="Maharashtra"
                  />
                  {fieldError('registered_address_state')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressPincode">
                    PIN Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="addressPincode"
                    inputMode="numeric"
                    value={addressPincode}
                    onChange={(e) => setAddressPincode(digitsOnly(e.target.value))}
                    placeholder="400001"
                    maxLength={6}
                  />
                  {fieldError('registered_address_pincode')}
                </div>

                {isBusiness && (
                  <>
                    <div className="space-y-2">
                      <Label>
                        Type of Address Proof <span className="text-destructive">*</span>
                      </Label>
                      <Select value={addressProofType} onValueChange={setAddressProofType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ADDRESS_PROOF_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldError('address_proof_type')}
                    </div>
                  </>
                )}
              </div>

              {isBusiness && (
                <>
                  <Separator className="my-5" />

                  <FileUpload
                    id="addressProofFile"
                    label="Address Proof Document"
                    description="Utility bill, rent agreement or GST registration certificate"
                    required
                    file={onFileAddressProof ? files[onFileAddressProof] : null}
                    existing={addressProofType ? existingByType[addressProofType] : null}
                    onSelect={(f) => {
                    setFiles((prev) => {
                      const next = { ...prev };
                      for (const type of ADDRESS_PROOF_TYPES) delete next[type];
                      if (f && addressProofType) next[addressProofType] = f;
                      return next;
                    });
                  }}
                    error={fieldErrors.address_proof_doc}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {rejectedDocs.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="text-sm">
                <p className="font-medium">Some documents were rejected</p>
                <p className="text-muted-foreground">
                  {rejectedDocs.map((d) => docTypeLabel(d.docType)).join(', ')} — please upload a clearer copy
                  and save again.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {profile && (
              <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      )}
    </main>
  );
};

export default EmployerProfile;
