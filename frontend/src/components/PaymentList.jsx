import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Banknote, CheckCircle2, XCircle } from 'lucide-react';
import api from '@/services/api';
import { showSuccess, showError } from '@/lib/toast';
import { formatMoney, timeAgo } from '@/lib/format';
import { paymentMethodLabel, PAYMENT_STATUS_META } from '@/lib/job';

/**
 * Payment ledger rows, shared by JobTracking and both dashboards' Payments tab.
 *
 * Worker + PENDING → "Confirm Receipt" (flips COMPLETED);
 * employer + PENDING → "Cancel" (flips CANCELLED). Everything else is read-only.
 *
 * A confirmation that completes the whole job (last unpaid hired worker) also
 * navigates to the job track page — that's where the auto-opened review modal
 * lives for both sides.
 */
export default function PaymentList({ payments, isEmployer, onChanged, showJob = false }) {
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();

  if (!payments || payments.length === 0) {
    return <p className="text-sm text-muted-foreground">No payments yet.</p>;
  }

  const confirmReceipt = async (payment) => {
    setBusyId(payment.id);
    try {
      const res = await api.put(`/payments/${payment.id}/confirm`);
      showSuccess('Payment confirmed — thank you!');
      if (onChanged) onChanged();
      // The final confirmation auto-completed the job — jump to the track page
      // so the review modal pops up right away (same-path navigate is a no-op;
      // the onChanged refetch above covers that case).
      if (res.data.data?.jobCompleted && payment.job?.id) {
        navigate(`/jobs/${payment.job.id}/track`);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to confirm payment');
    } finally {
      setBusyId(null);
    }
  };

  const cancelPayment = async (payment) => {
    if (!confirm(`Cancel the ${formatMoney(payment.amount)} payment to ${payment.worker.fullName}?`)) return;
    setBusyId(payment.id);
    try {
      await api.put(`/payments/${payment.id}/cancel`);
      showSuccess('Payment cancelled');
      if (onChanged) onChanged();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel payment');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      {payments.map((p) => {
        const meta = PAYMENT_STATUS_META[p.status] || { label: p.status, variant: 'outline' };
        const counterpart = isEmployer ? p.worker.fullName : p.employer.displayName;
        const fee = p.platformCommission ?? 0;
        const net = p.netAmount ?? (p.amount - fee);

        return (
          <div key={p.id} className="border rounded-lg p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{formatMoney(p.amount)}</span>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {counterpart}
                  {showJob && p.job ? <> • {p.job.title}</> : null}
                  {' • '}{paymentMethodLabel(p.paymentMethod)}
                  {p.reference ? ` • Ref: ${p.reference}` : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isEmployer
                    ? `${p.worker.fullName} receives ${formatMoney(net)} (${formatMoney(fee)} platform fee)`
                    : `You receive ${formatMoney(net)} (${formatMoney(p.amount)} − ${formatMoney(fee)} fee)`}
                  {' • '}{timeAgo(p.createdAt)}
                </p>
                {p.note && <p className="text-xs mt-1 italic">"{p.note}"</p>}
              </div>

              <div className="shrink-0">
                {p.status === 'PENDING' && !isEmployer && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={busyId === p.id}
                    onClick={() => confirmReceipt(p)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {busyId === p.id ? 'Confirming...' : 'Confirm Receipt'}
                  </Button>
                )}
                {p.status === 'PENDING' && isEmployer && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive hover:bg-destructive/10"
                    disabled={busyId === p.id}
                    onClick={() => cancelPayment(p)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                )}
                {p.status === 'COMPLETED' && (
                  <Banknote className="h-4 w-4 text-green-600" aria-hidden="true" />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
