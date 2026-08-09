import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../utils/api';
import { saveSession, ROLE_HOME } from '../utils/auth';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, token } = await loginUser(form);
      saveSession(token, user);
      navigate(ROLE_HOME[user.role] || '/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      {/* ── Left: Branding ── */}
      <aside className="auth-brand">
        <div className="auth-brand__content">
          <div className="swiftaid-logo">
            <span className="swiftaid-logo__bolt swiftaid-logo__bolt--pulse">⚡</span>
            <span className="swiftaid-logo__name swiftaid-logo__name--glow">SwiftAid</span>
          </div>
          <h1 className="brand-title brand-title--fade">
            Disaster relief,<br />coordinated in real time.
          </h1>
        </div>
      </aside>

      <div className="auth-form-wrap">
        <div className="auth-card">
          <h2>Sign in</h2>
          <p className="lead">Use the account you registered with.</p>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.org"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={update('password')}
                placeholder="••••••••"
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="form-footer">
            No account yet? <Link to="/register">Register here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
