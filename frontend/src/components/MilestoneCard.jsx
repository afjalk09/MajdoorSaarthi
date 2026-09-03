import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import api from '@/services/api';
import { Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function MilestoneCard({ jobId, isEmployer }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', due_date: '' });

  useEffect(() => {
    fetchMilestones();
  }, [jobId]);

  const fetchMilestones = async () => {
    try {
      const res = await api.get(`/milestones/job/${jobId}`);
      setMilestones(res.data.data);
    } catch (err) {
      console.error('Failed to fetch milestones');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMilestone = async () => {
    try {
      await api.post(`/milestones/job/${jobId}`, newMilestone);
      setShowAddDialog(false);
      setNewMilestone({ title: '', description: '', due_date: '' });
      fetchMilestones();
    } catch (err) {
      console.error('Failed to add milestone');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/milestones/${id}`, { status });
      fetchMilestones();
    } catch (err) {
      console.error('Failed to update milestone');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this milestone?')) return;
    try {
      await api.delete(`/milestones/${id}`);
      fetchMilestones();
    } catch (err) {
      console.error('Failed to delete milestone');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'IN_PROGRESS': return <Clock className="h-5 w-5 text-yellow-500" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED': return <Badge className="bg-green-500">Completed</Badge>;
      case 'IN_PROGRESS': return <Badge className="bg-yellow-500">In Progress</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading milestones...</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Milestones</CardTitle>
          {isEmployer && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Milestone</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={newMilestone.title}
                      onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                      placeholder="e.g., Site preparation complete"
                    />
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={newMilestone.description}
                      onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                      placeholder="Details about this milestone"
                    />
                  </div>
                  <div>
                    <Label>Due Date (optional)</Label>
                    <Input
                      type="date"
                      value={newMilestone.due_date}
                      onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddMilestone} className="w-full">Add Milestone</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No milestones yet. {isEmployer ? 'Add milestones to track progress.' : ''}
          </p>
        ) : (
          <div className="space-y-3">
            {milestones.map(milestone => (
              <div key={milestone.id} className="flex items-start gap-3 p-3 rounded-lg border">
                {getStatusIcon(milestone.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{milestone.title}</h4>
                    {getStatusBadge(milestone.status)}
                  </div>
                  {milestone.description && (
                    <p className="text-xs text-muted-foreground mt-1">{milestone.description}</p>
                  )}
                  {milestone.dueDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Due: {new Date(milestone.dueDate).toLocaleDateString()}
                    </p>
                  )}
                  {milestone.completedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Completed: {new Date(milestone.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {!isEmployer && milestone.status !== 'COMPLETED' && (
                  <div className="flex gap-1">
                    {milestone.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(milestone.id, 'IN_PROGRESS')}
                      >
                        Start
                      </Button>
                    )}
                    {milestone.status === 'IN_PROGRESS' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(milestone.id, 'COMPLETED')}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                )}
                {isEmployer && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(milestone.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
