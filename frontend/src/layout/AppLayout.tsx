import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { api } from '../api/client';
import type { Notification } from '../types/domain';

/** Wraps every authenticated page: top nav (role-aware links), a notification bell,
 * and sign-out. Pages render into <Outlet/>. */
export function AppLayout() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Notification[]>('/notifications')
      .then((list) => {
        if (!cancelled) setUnreadCount(list.filter((n) => !n.isRead).length);
      })
      .catch(() => {
        /* non-critical — the badge just stays at 0 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;
  // Force the change-password screen before anything else — a temporary password
  // shouldn't be usable to browse the rest of the app. /change-password itself lives
  // outside this layout (see App.tsx) so this redirect can't loop.
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;

  const isStudent = user.roles.includes('STUDENT');
  const isLecturer = user.roles.includes('LECTURER');
  const isStaff = user.roles.some((r) =>
    ['SUPER_ADMIN', 'REGISTRAR', 'ADMISSIONS_OFFICER', 'DEAN', 'HEAD_OF_DEPARTMENT'].includes(r),
  );
  const isSuperAdmin = user.roles.includes('SUPER_ADMIN');

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/dashboard" className="app-brand">
          University Portal
        </Link>
        <nav className="app-nav">
          {isStudent && (
            <>
              <Link to="/my-courses">My Courses</Link>
              <Link to="/transcript">Transcript</Link>
            </>
          )}
          {isLecturer && <Link to="/my-offerings">My Offerings</Link>}
          {isStaff && <Link to="/admin/academic-structure">Academic Structure</Link>}
          {isStaff && <Link to="/admin/applications">Applications</Link>}
          {isSuperAdmin && <Link to="/admin/users">Users &amp; Roles</Link>}
          <Link to="/notifications" className="app-nav-bell">
            Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Link>
        </nav>
        <div className="app-user">
          <span>
            {user.firstName} {user.lastName}
          </span>
          <button onClick={logout}>Sign out</button>
        </div>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
