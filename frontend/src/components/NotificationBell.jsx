import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import api from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import socket from '@/services/socket';
import { timeAgo } from '@/lib/format';
import { showSuccess, showError } from '@/lib/toast';

export default function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [workerAvailable, setWorkerAvailable] = useState(true);
  const navigate = useNavigate();

  const fetchWorkerAvailability = async () => {
    if (user?.role !== 'WORKER') return;
    try {
      const res = await api.get('/worker/profile');
      setWorkerAvailable(res.data.data?.availability === 'AVAILABLE');
    } catch (err) {
      console.error('Failed to fetch worker availability');
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    fetchRecentNotifications();
    fetchWorkerAvailability();
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchRecentNotifications();
      fetchWorkerAvailability();
    }, 30000);
    const onNewNotification = () => {
      fetchUnreadCount();
      fetchRecentNotifications();
    };
    socket.on('notification:new', onNewNotification);
    return () => {
      clearInterval(interval);
      socket.off('notification:new', onNewNotification);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.data.count);
    } catch (err) {
      console.error('Failed to fetch unread count');
    }
  };

  const fetchRecentNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch notifications');
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read');
    }
  };

  const handleNotificationClick = (notification) => {
    handleMarkAsRead(notification.id);
    if (['JOB_COMPLETED', 'REVIEW_REQUIRED'].includes(notification.type) && notification.job?.id) {
      navigate(`/jobs/${notification.job.id}/track`);
    }
  };

  const handleOfferAction = async (notification, action) => {
    try {
      const appId = notification.application?.id;
      if (!appId) return;
      await api.post(`/worker/applications/${appId}/${action}`);
      showSuccess(action === 'accept' ? 'Offer accepted — you are now hired!' : 'Offer rejected.');
      fetchUnreadCount();
      fetchRecentNotifications();
      fetchWorkerAvailability();
    } catch (err) {
      showError(err.response?.data?.message || `Failed to ${action} offer`);
    }
  };

  const handleApplicationAction = async (notification, action) => {
    try {
      const jobId = notification.job?.id || notification.jobId;
      const workerId = notification.application?.workerId;
      if (!jobId || !workerId) return;
      await api.post(`/jobs/${jobId}/${action}/${workerId}`);
      showSuccess(action === 'accept' ? 'Application accepted — worker assigned!' : 'Application rejected.');
      fetchUnreadCount();
      fetchRecentNotifications();
    } catch (err) {
      showError(err.response?.data?.message || `Failed to ${action} application`);
    }
  };

  return (
    <DropdownMenu onOpenChange={(open) => {
      if (open) {
        fetchUnreadCount();
        fetchRecentNotifications();
      }
    }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-xs h-7">
              Mark all read
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">
            No notifications yet
          </div>
        ) : (
          notifications.map(notification => (
            <DropdownMenuItem
              key={notification.id}
              className={`px-4 py-3 cursor-pointer ${!notification.isRead ? 'bg-muted/50' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{notification.title}</span>
                  {!notification.isRead && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                {notification.job && (
                  <span className="text-xs text-primary">{notification.job.title}</span>
                )}
                <span className="text-[10px] text-muted-foreground">{timeAgo(notification.createdAt)}</span>
                {notification.type === 'JOB_OFFER' && notification.application?.status === 'OFFERED' && (
                  <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                    {workerAvailable && (
                      <Button
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => handleOfferAction(notification, 'accept')}
                      >
                        Accept
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs flex-1"
                      onClick={() => handleOfferAction(notification, 'reject')}
                    >
                      Reject
                    </Button>
                  </div>
                )}
                {notification.type === 'APPLICATION_RECEIVED' && user?.role === 'EMPLOYER' && notification.application?.status === 'PENDING' && (
                  <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      className="h-7 text-xs flex-1"
                      onClick={() => handleApplicationAction(notification, 'accept')}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs flex-1"
                      onClick={() => handleApplicationAction(notification, 'reject')}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
        <div className="px-4 py-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-sm"
            onClick={() => navigate('/notifications')}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
