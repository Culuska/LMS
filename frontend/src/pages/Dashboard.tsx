import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { api } from '../api/client';
import type { Application, CourseOffering, CourseRegistration, Notification } from '../types/domain';
import {
  IconAward,
  IconBell,
  IconBook,
  IconBuilding,
  IconClipboard,
  IconShield,
  IconUsers,
} from '../components/icons';

interface HubLink {
  to: string;
  label: string;
  description: string;
  icon: (props: { className?: string }) => React.ReactElement;
}

interface StatTile {
  label: string;
  value: number | string;
}

/** Role-aware landing hub. Two jobs: a fast "what needs my attention" glance (the stat
 * row — real counts pulled live, never invented, per the Valuable pillar) and a "where
 * do I go" map that mirrors AppLayout's nav for anyone who lands here without having
 * learned the sidebar yet. */
export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatTile[] | null>(null);

  const isStudent = user?.roles.includes('STUDENT') ?? false;
  const isLecturer = user?.roles.includes('LECTURER') ?? false;
  const isStaff =
    user?.roles.some((r) => ['SUPER_ADMIN', 'REGISTRAR', 'ADMISSIONS_OFFICER', 'DEAN', 'HEAD_OF_DEPARTMENT'].includes(r)) ??
    false;
  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') ?? false;

  useEffect(() => {
    if (!user) return;
    const requests: Promise<StatTile>[] = [
      api.get<Notification[]>('/notifications').then((list) => ({
        label: 'Unread notifications',
        value: list.filter((n) => !n.isRead).length,
      })),
    ];
    if (isStudent) {
      requests.push(
        api.get<CourseRegistration[]>('/course-registrations/mine').then((list) => ({
          label: 'Registered courses',
          value: list.length,
        })),
      );
    }
    if (isLecturer) {
      requests.push(
        api.get<CourseOffering[]>('/course-offerings/mine').then((list) => ({
          label: 'Offerings this term',
          value: list.length,
        })),
      );
    }
    if (isStaff) {
      requests.push(
        api.get<Application[]>('/applications?status=SUBMITTED').then((list) => ({
          label: 'Applications awaiting review',
          value: list.length,
        })),
      );
    }
    Promise.all(requests)
      .then(setStats)
      .catch(() => setStats([]));
  }, [user, isStudent, isLecturer, isStaff]);

  if (!user) {
    return null; // ProtectedRoute guarantees this doesn't render for a logged-out user
  }

  const links: HubLink[] = [];
  if (isStudent) {
    links.push(
      { to: '/my-courses', label: 'My Courses', description: 'Registered courses, status, and grades', icon: IconBook },
      { to: '/transcript', label: 'Transcript', description: 'Official academic record and cumulative GPA', icon: IconAward },
    );
  }
  if (isLecturer) {
    links.push({ to: '/my-offerings', label: 'My Offerings', description: 'Gradebooks for the courses you teach', icon: IconUsers });
  }
  if (isStaff) {
    links.push(
      {
        to: '/admin/academic-structure',
        label: 'Academic Structure',
        description: 'Faculties, departments, programs, calendar, courses, offerings',
        icon: IconBuilding,
      },
      { to: '/admin/applications', label: 'Applications', description: 'Review and decide on admissions applications', icon: IconClipboard },
    );
  }
  if (isSuperAdmin) {
    links.push({ to: '/admin/users', label: 'Users & Roles', description: 'Create staff/student accounts and manage role grants', icon: IconShield });
  }
  links.push({
    to: '/notifications',
    label: 'Notifications',
    description: 'Announcements, grade updates, and requests needing your attention',
    icon: IconBell,
  });

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>
            Welcome back, {user.firstName}
          </h1>
          <p className="subtitle">
            Signed in as {user.email} · {user.roles.map((r) => r.replace(/_/g, ' ')).join(', ')}
          </p>
        </div>
      </div>

      {stats && stats.length > 0 && (
        <div className="stat-row">
          {stats.map((s) => (
            <div className="stat-tile" key={s.label}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="hub-grid">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="hub-card">
            <span className="hub-card-icon">
              <l.icon />
            </span>
            <h2>{l.label}</h2>
            <p>{l.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
