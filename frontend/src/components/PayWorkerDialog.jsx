import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IndianRupee } from 'lucide-react';
import api from '@/services/api';
import { showSuccess, showError } from '@/lib/toast';
import { formatMoney } from '@/lib/format';
import { PAYMENT_METHOD_LABELS } from '@/lib/job';

/**
 * Employer records a payment to one hired worker on a job.
 *
 * Manual ledger flow: this creates a PENDING payment (the employer's claim that
 * they sent the money); the worker confirms receipt, which flips it COMPLETED.
 * The platform's 5% commission is carved out of the amount, so the worker
 * receives `amount - commission` — the dialog shows that split up front.
 */
export default function PayWorkerDialog({ job, worker, onPaid, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const numericAmount = parseFloat(amount);
  const preview = Number.isFinite(numericAmount) && numericAmount > 0
    ? { gross: numericAmount, fee: Math.round(numericAmount * 0.05 * 100) / 100 }
    : null;
  if (preview) preview.net = Math.round((preview.gross - preview.fee) * 100) / 100;

  const handleOpen = (o) => {
    setOpen(o);
    if (o) {
      // Prefill from the job's posted wage — the agreed rate for this work.
      setAmount(job?.wageAmount ? String(job.wageAmount) : '');
      setMethod('UPI');
      setReference('');
      setNote('');
    }
  };

  const handleSubmit = async () => {
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showError('Enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await api.post('/payments', {
        job_id: job.id,
        worker_id: worker.id,
        amount: numericAmount,
        payment_method: method,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined
      });
      setOpen(false);
      showSuccess(`Payment of ${formatMoney(numericAmount)} sent to ${worker.fullName}`);
      if (onPaid) onPaid();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to send payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={disabled}>
          <IndianRupee className="h-4 w-4 mr-1" />
          Pay
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay {worker.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Record a payment for {worker.roleName ? `${worker.roleName} work` : 'work'} on{' '}
            <span className="font-medium text-foreground">{job?.title}</span>. The worker confirms
            receipt to complete it — a 5% platform fee is deducted from the amount.
          </p>

          <div>
            <Label htmlFor="pay-amount">Amount (₹)</Label>
            <Input
              id="pay-amount"
              type="number"
              min="1"
              step="0.01"
              className="mt-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
            />
          </div>

          {preview && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">You pay</span>
                <span className="font-medium">{formatMoney(preview.gross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform fee (5%)</span>
                <span>{formatMoney(preview.fee)}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-muted-foreground">{worker.fullName} receives</span>
                <span className="font-semibold text-green-600">{formatMoney(preview.net)}</span>
              </div>
            </div>
          )}

          <div>
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="pay-reference">Reference (optional)</Label>
            <Input
              id="pay-reference"
              className="mt-1"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UPI txn ID / cheque no."
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="pay-note">Note (optional)</Label>
            <Textarea
              id="pay-note"
              className="mt-1"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Day 3 of 5"
              maxLength={500}
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? 'Sending...' : 'Send Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
