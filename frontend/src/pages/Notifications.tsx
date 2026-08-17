import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Notification } from '../types/domain';

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

  return (
    <div>
      <h1>Notifications</h1>
      {error && <p className="error">{error}</p>}
      {!notifications ? (
        <p>Loading…</p>
      ) : notifications.length === 0 ? (
        <p>No notifications yet.</p>
      ) : (
        <ul className="notification-list">
          {notifications.map((n) => (
            <li key={n.id} className={n.isRead ? 'notification-read' : 'notification-unread'}>
              <div>
                <strong>{n.title}</strong>
                <p>{n.body}</p>
                <span className="notification-date">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              {!n.isRead && <button onClick={() => void markRead(n.id)}>Mark read</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
