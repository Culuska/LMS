import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/useAuth';

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
      <form className="login-form" onSubmit={submit}>
        <h1>{forced ? 'Set a new password' : 'Change password'}</h1>
        {forced && (
          <p>
            You're signed in with a temporary password. Choose a new one before
            continuing.
          </p>
        )}
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save new password'}
        </button>
        {!forced && (
          <button type="button" onClick={() => navigate(-1)}>
            Cancel
          </button>
        )}
        <button type="button" onClick={logout}>
          Sign out instead
        </button>
      </form>
    </div>
  );
}
