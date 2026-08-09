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
      <aside className="auth-brand">
        <div>
          <div className="brand-mark">Coordination Access</div>
          <h1 className="brand-title">
            Disaster relief,
            <br />
            coordinated in real time.
          </h1>
          <p className="brand-sub">
            One login, four roles. Sign in to reach the queue, shelter, and
            distribution data that matters to your role.
          </p>

          <div className="access-badges">
            <span className="access-badge"><span className="dot" />Admin</span>
            <span className="access-badge"><span className="dot" />Donor</span>
            <span className="access-badge"><span className="dot" />Team</span>
            <span className="access-badge"><span className="dot" />Volunteer</span>
          </div>
        </div>

        <div className="status-line">DRMS_LOCAL · connected to postgres:5432</div>
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
