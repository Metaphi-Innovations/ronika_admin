import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, AlertCircle, ExternalLink } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Invalid login credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-layout">
      {/* Left Branding Section */}
      <div className="auth-sidebar">
        <div className="auth-sidebar-top">
          <span className="auth-sidebar-title">Ronika Bhatia</span>
          <span className="auth-sidebar-subtitle">Admin CMS Control Panel</span>
        </div>

        <div className="auth-sidebar-center">
          <div className="auth-sidebar-step">01</div>
          <div className="auth-sidebar-heading">Admin Access</div>
          <div className="auth-sidebar-line"></div>
          <div className="auth-sidebar-desc">
            Manage the work.<br />
            Shape the portfolio.
          </div>
        </div>

        <div className="auth-sidebar-bottom">
          <span>Ronika Bhatia Digital Portfolio</span>
          <span style={{ color: '#555' }}>&copy; 2026</span>
        </div>
      </div>

      {/* Right Authentication Section */}
      <div className="auth-main">
        <header className="auth-main-header">
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="auth-link"
          >
            <ExternalLink size={14} />
            <span>View Live Portfolio</span>
          </a>
        </header>

        <div className="auth-form-container">
          <div className="auth-form-wrapper">
            <span className="auth-label-small">Admin Panel</span>
            <h1 className="auth-heading">Welcome back.</h1>
            <p className="auth-subheading">Sign in to manage your portfolio.</p>

            {error && (
              <div className="alert-error" style={{ marginBottom: '24px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Admin Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="admin@ronikabhatia.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" htmlFor="password">
                    Password
                  </label>
                </div>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                  <input type="checkbox" style={{ accentColor: '#111' }} />
                  Remember me
                </label>
                
                <Link to="/forgot-password" style={{ fontSize: '13px', color: 'var(--admin-text-main)', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot Password?
                </Link>
              </div>

              <div className="auth-form-footer">
                <button
                  type="submit"
                  className="auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <span>Signing in...</span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={16} className="arrow" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div style={{ marginTop: '3rem', fontSize: '11px', color: 'var(--admin-text-light)', fontFamily: 'var(--admin-font-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ronika Bhatia Admin Panel
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
