import { useNavigate } from 'react-router-dom';
import { Bell, Check, Calendar, Users, DollarSign, AlertCircle, LogOut, Shield } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { Card, Badge, EmptyState } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { getRelativeTime } from '../utils/helpers';
import type { Notification } from '../types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  event: Calendar,
  membership: Users,
  budget: DollarSign,
  system: AlertCircle,
  announcement: Bell,
  leave_request: LogOut,
  role_request: Shield,
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const getIcon = (type: string) => {
    const Icon = iconMap[type] || Bell;
    return <Icon className="h-5 w-5" />;
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    // Navigate based on notification type
    if (notification.reference_type === 'leave_request' && notification.reference_id) {
      navigate(`/clubs/${notification.reference_id}`);
    } else if (notification.reference_type === 'role_request' && notification.reference_id) {
      navigate(`/clubs/${notification.reference_id}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <Check className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <EmptyState
            title="No notifications"
            description="You're all caught up! Check back later for updates."
            icon={<Bell className="h-12 w-12" />}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={!notification.is_read ? 'border-l-4 border-l-blue-500 cursor-pointer' : 'cursor-pointer'}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`rounded-lg p-3 ${
                    notification.is_read ? 'text-gray-400 bg-gray-100' : 'text-blue-600 bg-blue-50'
                  }`}
                >
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-medium ${notification.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                    </div>
                    {!notification.is_read && (
                      <Badge variant="info">New</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{getRelativeTime(notification.created_at)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
