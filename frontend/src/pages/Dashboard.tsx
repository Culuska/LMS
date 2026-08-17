import { useAuth } from '../auth/useAuth';

/**
 * Placeholder landing page after login — proves the auth flow works end to end.
 * Real role-specific dashboards (per docs/00-requirements-audit.md §16) are not
 * built yet; this deliberately shows raw account info rather than pretending to be
 * a finished dashboard.
 */
export function Dashboard() {
  const { user, logout } = useAuth();

  if (!user) {
    return null; // ProtectedRoute guarantees this doesn't render for a logged-out user
  }

  return (
    <div className="dashboard-page">
      <header>
        <h1>
          Welcome, {user.firstName} {user.lastName}
        </h1>
        <button onClick={logout}>Sign out</button>
      </header>
      <p>
        Signed in as <strong>{user.email}</strong>
      </p>
      <p>
        Role(s): {user.roles.join(', ')}
      </p>
      <p className="placeholder-note">
        This is a placeholder — role-specific dashboards (student/lecturer/registrar/
        admin, per docs/00-requirements-audit.md §16) are not built yet.
      </p>
    </div>
  );
}
