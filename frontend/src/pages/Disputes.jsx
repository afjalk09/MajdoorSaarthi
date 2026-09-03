import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import api from '@/services/api';

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const res = await api.get('/disputes/my');
      setDisputes(res.data.data);
    } catch (err) {
      console.error('Failed to fetch disputes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN': return <Badge className="bg-red-500">Open</Badge>;
      case 'IN_REVIEW': return <Badge className="bg-yellow-500">In Review</Badge>;
      case 'RESOLVED': return <Badge className="bg-green-500">Resolved</Badge>;
      case 'DISMISSED': return <Badge variant="secondary">Dismissed</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReasonLabel = (reason) => {
    const labels = {
      PAYMENT: 'Payment Issue',
      QUALITY: 'Quality of Work',
      ABSENCE: 'Absence / No Show',
      SAFETY: 'Safety Concern',
      OTHER: 'Other'
    };
    return labels[reason] || reason;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading disputes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h1 className="text-2xl font-bold">My Disputes</h1>
        </div>

        {disputes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No disputes raised yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {disputes.map(dispute => (
              <Card key={dispute.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{dispute.job?.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Reason: {getReasonLabel(dispute.reason)}
                      </p>
                    </div>
                    {getStatusBadge(dispute.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{dispute.description}</p>
                  {dispute.resolution && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Resolution:</p>
                      <p className="text-sm">{dispute.resolution}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    Raised: {new Date(dispute.createdAt).toLocaleString()}
                  </p>
                  {dispute.resolvedAt && (
                    <p className="text-xs text-muted-foreground">
                      Resolved: {new Date(dispute.resolvedAt).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
