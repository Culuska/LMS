import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

interface HubLink {
  to: string;
  label: string;
  description: string;
}

/** Role-aware landing hub — the shell (AppLayout) already has these as nav links, this
 * page repeats the ones relevant to the signed-in user as a friendlier "what can I do
 * here" entry point, mirroring the role list built out in docs/00 §16. */
export function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return null; // ProtectedRoute guarantees this doesn't render for a logged-out user
  }

  const isStudent = user.roles.includes('STUDENT');
  const isLecturer = user.roles.includes('LECTURER');
  const isStaff = user.roles.some((r) =>
    ['SUPER_ADMIN', 'REGISTRAR', 'ADMISSIONS_OFFICER', 'DEAN', 'HEAD_OF_DEPARTMENT'].includes(r),
  );
  const isSuperAdmin = user.roles.includes('SUPER_ADMIN');

  const links: HubLink[] = [];
  if (isStudent) {
    links.push(
      { to: '/my-courses', label: 'My Courses', description: 'Registered courses, status, and grades' },
      { to: '/transcript', label: 'Transcript', description: 'Official academic record and cumulative GPA' },
    );
  }
  if (isLecturer) {
    links.push({ to: '/my-offerings', label: 'My Offerings', description: 'Gradebooks for the courses you teach' });
  }
  if (isStaff) {
    links.push(
      { to: '/admin/academic-structure', label: 'Academic Structure', description: 'Faculties, departments, programs, calendar, courses, offerings' },
      { to: '/admin/applications', label: 'Applications', description: 'Review and decide on admissions applications' },
    );
  }
  if (isSuperAdmin) {
    links.push({ to: '/admin/users', label: 'Users & Roles', description: 'Create staff/student accounts and manage role grants' });
  }
  links.push({ to: '/notifications', label: 'Notifications', description: 'Announcements, grade updates, and requests needing your attention' });

  return (
    <div className="dashboard-page">
      <header>
        <h1>
          Welcome, {user.firstName} {user.lastName}
        </h1>
      </header>
      <p>
        Signed in as <strong>{user.email}</strong> — Role(s): {user.roles.join(', ')}
      </p>
      <div className="hub-grid">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="hub-card">
            <h2>{l.label}</h2>
            <p>{l.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
