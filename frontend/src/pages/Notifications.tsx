import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Notification } from '../types/domain';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, Loading } from '../components/StateViews';
import { IconBell } from '../components/icons';

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api
      .get<Notification[]>('/notifications')
      .then(setNotifications)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load notifications'));
  };

  useEffect(load, []);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to mark as read');
    }
  };

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up.'}
        crumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Notifications' }]}
      />
      {error && <p className="error" role="alert">{error}</p>}
      {!notifications ? (
        <Loading label="Loading notifications…" />
      ) : notifications.length === 0 ? (
        <EmptyState icon={<IconBell />} title="No notifications yet" description="Announcements, grade updates, and requests will show up here." />
      ) : (
        <ul className="notification-list" aria-label="Notifications">
          {notifications.map((n) => (
            <li key={n.id} className={n.isRead ? 'notification-read' : 'notification-unread'}>
              <div>
                <strong>{n.title}</strong>
                <p>{n.body}</p>
                <span className="notification-date">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              {!n.isRead && (
                <button className="btn btn-secondary btn-sm" onClick={() => void markRead(n.id)}>
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
