import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resendCode, verifyEmail } from '../utils/api';
import '../styles/auth-background.css';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState(location.state?.mailError ? 'We could not send the first email. Use Resend below to get a code.' : '');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await verifyEmail({ email, code });
      setSuccess('Email verified. Redirecting to sign in…');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email || cooldown > 0) return;
    setError('');
    setSuccess('');
    try {
      await resendCode({ email });
      setSuccess('A new code was sent. It expires in 15 minutes.');
      setCooldown(60);
    } catch (err) {
      const retry = err.details?.retryAfter;
      if (retry) setCooldown(retry);
      setError(err.message);
    }
  }

  return (
    <div className="auth-shell auth-shell--solo auth-shell--animated">
      <div className="auth-bg__sky" aria-hidden="true" />
      <div className="auth-bg__grain" aria-hidden="true" />

      <div className="auth-form-wrap">
        <div className="auth-card">
          <h2>Verify your email</h2>
          <p className="lead">Enter the 6-digit code we sent you.</p>

          {error && <div className="error-banner">{error}</div>}
          {success && <div className="success-banner">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.org"
              />
            </div>

            <div className="field">
              <label htmlFor="code">Verification code</label>
              <input
                id="code"
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify email'}
            </button>
          </form>

          <div className="form-footer">
            Didn&apos;t get a code?{' '}
            <button
              type="button"
              className="btn-link"
              onClick={handleResend}
              disabled={!email || cooldown > 0}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
            {' · '}
            <Link to="/login">Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
