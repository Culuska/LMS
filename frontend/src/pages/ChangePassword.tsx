import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { IconAlertCircle } from '../components/icons';

/** Reachable two ways: forced (AppLayout redirects here whenever
 * user.mustChangePassword is true, e.g. right after account creation with a temporary
 * password) or voluntary (a signed-in user choosing to change their password). The
 * "forced" case doesn't get the normal AppLayout nav — see App.tsx routing — so this
 * page stands alone deliberately, rather than looking like just another settings tab. */
export function ChangePassword() {
  const { user, clearMustChangePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const forced = user?.mustChangePassword ?? false;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      clearMustChangePassword();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-brand">
          <span className="app-brand-mark" style={{ width: '2.6rem', height: '2.6rem', fontSize: '1.15rem' }} aria-hidden="true">
            B
          </span>
          <span className="app-brand-name" style={{ fontSize: '1.3rem' }}>
            BaroTech
          </span>
        </div>

        <form className="login-form" onSubmit={submit}>
          <div>
            <h1>{forced ? 'Set a new password' : 'Change password'}</h1>
            {forced && (
              <p className="lede">You're signed in with a temporary password. Choose a new one to continue.</p>
            )}
          </div>

          <label htmlFor="cp-current">
            Current password
            <input
              id="cp-current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <label htmlFor="cp-new">
            New password
            <input
              id="cp-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              aria-describedby="cp-new-hint"
            />
            <span id="cp-new-hint" className="field-hint">
              At least 8 characters.
            </span>
          </label>
          <label htmlFor="cp-confirm">
            Confirm new password
            <input
              id="cp-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          {error && (
            <p className="error" role="alert">
              <IconAlertCircle style={{ width: '1rem', height: '1rem', flexShrink: 0, marginTop: '0.1rem' }} />
              <span>{error}</span>
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save new password'}
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!forced && (
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate(-1)}>
                Cancel
              </button>
            )}
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={logout}>
              Sign out instead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
