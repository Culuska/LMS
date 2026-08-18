import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ApiError } from '../api/client';
import { IconAlertCircle } from '../components/icons';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

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

        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <h1>Sign in</h1>
            <p className="lede">Use your university email and password to continue.</p>
          </div>

          <label htmlFor="login-email">
            Email address
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="you@barotech.edu"
            />
          </label>
          <label htmlFor="login-password">
            Password
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="error" role="alert">
              <IconAlertCircle style={{ width: '1rem', height: '1rem', flexShrink: 0, marginTop: '0.1rem' }} />
              <span>{error}</span>
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-footnote">
          Trouble signing in? Contact your registrar's office or{' '}
          <a href="mailto:support@barotech.edu">support@barotech.edu</a>.
        </p>
      </div>
    </div>
  );
}
