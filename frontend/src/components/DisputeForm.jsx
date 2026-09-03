import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import api from '@/services/api';

export default function DisputeForm({ jobId, onDisputeRaised }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = [
    { value: 'PAYMENT', label: 'Payment Issue' },
    { value: 'QUALITY', label: 'Quality of Work' },
    { value: 'ABSENCE', label: 'Absence / No Show' },
    { value: 'SAFETY', label: 'Safety Concern' },
    { value: 'OTHER', label: 'Other' }
  ];

  const handleSubmit = async () => {
    if (!reason || !description) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/disputes', {
        job_id: jobId,
        reason,
        description
      });
      setOpen(false);
      setReason('');
      setDescription('');
      if (onDisputeRaised) onDisputeRaised();
      alert('Dispute raised successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to raise dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10">
          <AlertTriangle className="h-4 w-4 mr-1" />
          Raise Dispute
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise a Dispute</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
            />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? 'Submitting...' : 'Submit Dispute'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
