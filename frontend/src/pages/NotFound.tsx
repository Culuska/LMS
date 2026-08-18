import { Link } from 'react-router-dom';

/** A real 404, not a silent redirect — a broken/mistyped link should say so,
 * not quietly bounce the user somewhere they didn't ask for (Credible: accurate
 * information about what actually happened). */
export function NotFound() {
  return (
    <div className="empty-state" role="alert" style={{ marginTop: '3rem' }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        <path d="M8.5 11h5" strokeLinecap="round" />
      </svg>
      <h1 style={{ fontSize: 'var(--text-lg)' }}>Page not found</h1>
      <p>The page you're looking for doesn't exist, or you may not have access to it.</p>
      <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
        Back to dashboard
      </Link>
    </div>
  );
}
