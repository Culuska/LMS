import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { api } from '../api/client';
import type {
  Application,
  AssessmentItem,
  AttendanceSession,
  CourseOffering,
  CourseRegistration,
  Notification,
  RosterEntry,
} from '../types/domain';
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

/** Best-effort: a stat that fails to load (one bad offering, a network blip) shouldn't
 * blank out every other stat on the page — it just reports 0 for that one number. */
function safeCount<T>(promise: Promise<T[]>): Promise<T[]> {
  return promise.catch(() => []);
}

async function loadLecturerStats(offerings: CourseOffering[]): Promise<StatTile[]> {
  const perOffering = await Promise.all(
    offerings.map((o) =>
      Promise.all([
        safeCount(api.get<RosterEntry[]>(`/course-registrations/offering/${o.id}`)),
        safeCount(api.get<AssessmentItem[]>(`/course-offerings/${o.id}/assessment-items`)),
        safeCount(api.get<AttendanceSession[]>(`/course-offerings/${o.id}/attendance-sessions`)),
      ]),
    ),
  );

  const studentIds = new Set<string>();
  let enrollments = 0;
  let assignments = 0;
  let quizzes = 0;
  let attendanceSessions = 0;
  for (const [roster, items, sessions] of perOffering) {
    enrollments += roster.length;
    for (const r of roster) studentIds.add(r.student.id);
    assignments += items.filter((i) => i.type === 'ASSIGNMENT').length;
    quizzes += items.filter((i) => i.type === 'QUIZ').length;
    attendanceSessions += sessions.length;
  }

  return [
    { label: 'My courses', value: offerings.length },
    { label: 'Total students', value: studentIds.size },
    { label: 'Course enrollments', value: enrollments },
    { label: 'Assignments', value: assignments },
    { label: 'Quizzes', value: quizzes },
    { label: 'Attendance sessions taken', value: attendanceSessions },
  ];
}

async function loadStudentStats(registrations: CourseRegistration[], studentId: string): Promise<StatTile[]> {
  const percentages = await Promise.all(
    registrations.map((r) =>
      api
        .get<{ percentage: number }>(
          `/course-offerings/${r.courseOffering.id}/attendance-sessions/percentage?studentId=${studentId}`,
        )
        .then((res) => res.percentage)
        .catch(() => null),
    ),
  );
  const known = percentages.filter((p): p is number => p !== null);
  const avgAttendance = known.length > 0 ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : null;

  const stats: StatTile[] = [{ label: 'My courses', value: registrations.length }];
  if (avgAttendance !== null) {
    stats.push({ label: 'Average attendance', value: `${avgAttendance}%` });
  }
  return stats;
}

/** Role-aware landing hub. Two jobs: a fast "what needs my attention" glance (the stat
 * row and recent-activity list — real data pulled live, never invented) and a "where do
 * I go" map that mirrors AppLayout's nav for anyone who lands here without having
 * learned the sidebar yet. */
export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatTile[] | null>(null);
  const [recentActivity, setRecentActivity] = useState<Notification[] | null>(null);

  const isStudent = user?.roles.includes('STUDENT') ?? false;
  const isLecturer = user?.roles.includes('LECTURER') ?? false;
  const isStaff =
    user?.roles.some((r) => ['SUPER_ADMIN', 'REGISTRAR', 'ADMISSIONS_OFFICER', 'DEAN', 'HEAD_OF_DEPARTMENT'].includes(r)) ??
    false;
  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') ?? false;

  useEffect(() => {
    if (!user) return;

    api
      .get<Notification[]>('/notifications')
      .then((list) => {
        setRecentActivity(
          [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
        );
        return { label: 'Unread notifications', value: list.filter((n) => !n.isRead).length } as StatTile;
      })
      .catch(() => ({ label: 'Unread notifications', value: 0 }) as StatTile)
      .then((notificationsTile) => {
        const roleStats: Promise<StatTile[]> = isStudent
          ? api
              .get<CourseRegistration[]>('/course-registrations/mine')
              .then((list) => loadStudentStats(list, user.studentId ?? ''))
              .catch(() => [])
          : isLecturer
            ? api
                .get<CourseOffering[]>('/course-offerings/mine')
                .then((offerings) => loadLecturerStats(offerings))
                .catch(() => [])
            : Promise.resolve([]);

        const staffStats: Promise<StatTile[]> = isStaff
          ? api
              .get<Application[]>('/applications?status=SUBMITTED')
              .then((list) => [{ label: 'Applications awaiting review', value: list.length }] as StatTile[])
              .catch(() => [])
          : Promise.resolve([]);

        return Promise.all([roleStats, staffStats]).then(([role, staff]) => [...role, ...staff, notificationsTile]);
      })
      .then(setStats)
      .catch(() => setStats([]));
  }, [user, isStudent, isLecturer, isStaff]);

  if (!user) {
    return null; // ProtectedRoute guarantees this doesn't render for a logged-out user
  }

  const links: HubLink[] = [];
  if (isStudent) {
    links.push(
      { to: '/my-courses', label: 'My Courses', description: 'Content, attendance, assignments, and quizzes for each course', icon: IconBook },
      { to: '/transcript', label: 'Transcript', description: 'Official academic record and cumulative GPA', icon: IconAward },
    );
  }
  if (isLecturer) {
    links.push({ to: '/my-offerings', label: 'My Offerings', description: 'Create courses and manage content, attendance, and grades', icon: IconUsers });
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

      {recentActivity && recentActivity.length > 0 && (
        <div style={{ margin: 'var(--space-6) 0' }}>
          <h2 style={{ marginBottom: 'var(--space-3)' }}>Recent activity</h2>
          <div className="table-scroll">
            <table className="data-table">
              <tbody>
                {recentActivity.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <strong>{n.title}</strong>
                      {n.body && <div style={{ color: 'var(--color-ink-faint)' }}>{n.body}</div>}
                    </td>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(n.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
