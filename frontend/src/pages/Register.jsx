import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../utils/api';

const ROLES = ['admin', 'donor', 'team', 'volunteer'];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'donor',
    phone: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await registerUser(form);
      setSuccess('Account created. Redirecting to sign in…');
      setTimeout(() => navigate('/login'), 1200);
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
          <div className="brand-mark">New Access Request</div>
          <h1 className="brand-title">
            Register for
            <br />
            coordination access.
          </h1>
          <p className="brand-sub">
            Every account is tied to one role. That role decides which queue
            you land on after signing in — nothing more, nothing less.
          </p>

          <div className="access-badges">
            <span className="access-badge"><span className="dot" />Admin</span>
            <span className="access-badge"><span className="dot" />Donor</span>
            <span className="access-badge"><span className="dot" />Team</span>
            <span className="access-badge"><span className="dot" />Volunteer</span>
          </div>
        </div>

        <div className="status-line">Row written to users table on submit</div>
      </aside>

      <div className="auth-form-wrap">
        <div className="auth-card">
          <h2>Create account</h2>
          <p className="lead">Takes about a minute.</p>

          {error && <div className="error-banner">{error}</div>}
          {success && <div className="success-banner">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="full_name">Full name</label>
              <input
                id="full_name"
                type="text"
                required
                value={form.full_name}
                onChange={update('full_name')}
                placeholder="Jane Rahman"
              />
            </div>

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
              <label htmlFor="phone">Phone (optional)</label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={update('phone')}
                placeholder="+8801XXXXXXXXX"
              />
            </div>

            <div className="field">
              <label htmlFor="role">Role</label>
              <select id="role" value={form.role} onChange={update('role')}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={update('password')}
                placeholder="At least 6 characters"
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="form-footer">
            Already registered? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
