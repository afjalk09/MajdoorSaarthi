import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/services/api';
import { showError } from '@/lib/toast';
import { formatMoney } from '@/lib/format';
import PaymentList from '@/components/PaymentList';
import PayWorkerDialog from '@/components/PayWorkerDialog';

/**
 * The payment ledger for ONE job (both sides).
 *
 * Employer sees paid/pending totals and can cancel pending payments; the
 * worker sees what they've earned and confirms receipt. Fetches
 * `GET /payments/job/:id` (participant-gated on the server — unlike the job
 * itself, money is only visible to its parties).
 *
 * For the employer it is ALSO the send-payment entry point (worker picker +
 * PayWorkerDialog) so payments stay possible after the job is completed —
 * the Job Actions card (and its per-row Pay buttons) only exists while the
 * job is OPEN/IN_PROGRESS. One payment per worker per job: workers who
 * already have a non-cancelled payment drop out of the picker, and once all
 * are paid the block is replaced by a note.
 *
 * `reloadToken` bumps to refetch after an external action (e.g. the employer
 * sends a payment from the hired-worker row). `onPaid` bubbles any payment
 * change (send OR worker confirm) to the parent — JobTracking refetches the
 * job, which may have just auto-completed. `onPaymentsLoaded` hands the raw
 * list up so the parent can derive per-worker paid state for its own buttons.
 */
export default function JobPaymentsCard({ job, isEmployer, reloadToken = 0, onPaid, onPaymentsLoaded }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payWorkerId, setPayWorkerId] = useState('');

  const hiredWorkers = job.hiredWorkers || [];
  // Any non-cancelled payment locks that worker out of repaying (server
  // enforces the same rule — this is just the UI mirror of it).
  const lockedWorkerIds = new Set(
    payments.filter(p => p.status !== 'CANCELLED').map(p => p.worker?.id).filter(Boolean)
  );
  const unpaidWorkers = hiredWorkers.filter(w => !lockedWorkerIds.has(w.id));
  // Fallback to the first unpaid worker so the dialog always has a target.
  const selectedWorker = unpaidWorkers.find(w => w.id === payWorkerId) || unpaidWorkers[0] || null;

  const fetchPayments = useCallback(async () => {
    try {
      const res = await api.get(`/payments/job/${job.id}`);
      const list = res.data.data || [];
      setPayments(list);
      if (onPaymentsLoaded) onPaymentsLoaded(list);
    } catch (err) {
      // 403 is expected for a non-participant; anything else is worth surfacing.
      if (err.response?.status !== 403) {
        showError(err.response?.data?.message || 'Failed to load payments');
      }
      setPayments([]);
      if (onPaymentsLoaded) onPaymentsLoaded([]);
    } finally {
      setLoading(false);
    }
  }, [job.id, onPaymentsLoaded]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments, reloadToken]);

  const handlePaid = () => {
    fetchPayments();
    if (onPaid) onPaid();
  };

  const confirmed = payments
    .filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + p.amount, 0);
  const pending = payments
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Payments</CardTitle>
            <CardDescription>
              {isEmployer
                ? 'Record payments to hired workers — they confirm receipt to complete each one.'
                : 'Confirm receipt of payments sent to you for this job.'}
            </CardDescription>
          </div>
          {!loading && payments.length > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">{isEmployer ? 'Paid' : 'Confirmed'}</p>
              <p className="font-semibold text-green-600">{formatMoney(confirmed)}</p>
              {pending > 0 && (
                <>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isEmployer ? 'Pending' : 'Awaiting you'}
                  </p>
                  <p className="font-medium text-amber-600">{formatMoney(pending)}</p>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEmployer && hiredWorkers.length > 0 && (
          unpaidWorkers.length > 0 ? (
            <div className="flex items-center justify-between gap-3 flex-wrap pb-3 mb-3 border-b">
              <div>
                <p className="text-sm font-medium">Send a payment</p>
                <p className="text-xs text-muted-foreground">
                  Pick the worker you paid outside the app to record it here — they confirm receipt.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedWorker?.id || ''} onValueChange={setPayWorkerId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {unpaidWorkers.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <PayWorkerDialog
                  job={job}
                  worker={selectedWorker}
                  onPaid={handlePaid}
                  disabled={!selectedWorker}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground pb-3 mb-3 border-b">
              All hired workers have been paid for this job.
            </p>
          )
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading payments...</p>
        ) : (
          <PaymentList
            payments={payments}
            isEmployer={isEmployer}
            onChanged={handlePaid}
            showJob={false}
          />
        )}
      </CardContent>
    </Card>
  );
}
