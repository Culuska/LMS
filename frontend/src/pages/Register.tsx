import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ApiError } from '../api/client';
import { IconAlertCircle } from '../components/icons';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ email, password, firstName, lastName });
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
            <h1>Create your account</h1>
            <p className="lede">Sign up as a student to register for courses.</p>
          </div>

          <label htmlFor="register-first-name">
            First name
            <input
              id="register-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
            />
          </label>
          <label htmlFor="register-last-name">
            Last name
            <input
              id="register-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
            />
          </label>
          <label htmlFor="register-email">
            Email address
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="you@barotech.edu"
            />
          </label>
          <label htmlFor="register-password">
            Password
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-faint)' }}>
              At least 8 characters, including a number.
            </span>
          </label>

          {error && (
            <p className="error" role="alert">
              <IconAlertCircle style={{ width: '1rem', height: '1rem', flexShrink: 0, marginTop: '0.1rem' }} />
              <span>{error}</span>
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="login-footnote">
          Already have an account? <Link to="/login">Sign in</Link>.
        </p>
      </div>
    </div>
  );
}
