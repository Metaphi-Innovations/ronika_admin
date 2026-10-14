import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import {
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { PasswordInput } from '../components/PasswordInput';

/**
 * Resolves the public frontend portfolio URL.
 * Defaults directly to the live production portfolio https://ronika-website.vercel.app.
 */
const getLivePortfolioUrl = (): string => {
  return import.meta.env.VITE_CLIENT_URL || 'https://ronika-website.vercel.app';
};

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('admin_remember_me') === 'true';
  });
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const alert = useAlert();
  const navigate = useNavigate();

  // Show toast if deactivated
  useEffect(() => {
    if (searchParams.get('deactivated') === 'true') {
      alert.error('Your account has been deactivated. Please contact Super Admin.', 'Session Ended');
    }
  }, [searchParams]);

  // Prefill remembered email if saved
  useEffect(() => {
    const savedEmail = localStorage.getItem('admin_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() && !password) {
      alert.error('Please enter the email and password.', 'Required Fields');
      return;
    }

    if (!email.trim()) {
      alert.error('Please enter the email.', 'Required Field');
      return;
    }

    if (!password) {
      alert.error('Please enter the password.', 'Required Field');
      return;
    }

    try {
      setLoading(true);

      await login(email.trim(), password);

      if (rememberMe) {
        localStorage.setItem('admin_saved_email', email.trim());
        localStorage.setItem('admin_remember_me', 'true');
      } else {
        localStorage.removeItem('admin_saved_email');
        localStorage.removeItem('admin_remember_me');
      }

      navigate('/');
    } catch (err: any) {
      const msg = err.message || 'Invalid login credentials. Please try again.';
      alert.error(msg, 'Login Failed');
    } finally {
      setLoading(false);
    }
  };

  const livePortfolioUrl = getLivePortfolioUrl();

  return (
    <div className="auth-split-layout">
      {/* Left Branding Section */}
      <div className="auth-sidebar">
        <div className="auth-sidebar-top">
          <span className="auth-sidebar-title">Ronika Bhatia</span>
          <span className="auth-sidebar-subtitle">Admin Panel</span>
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
        </div>
      </div>

      {/* Right Authentication Section */}
      <div className="auth-main">
        <header className="auth-main-header">
          <a
            href={livePortfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="auth-link"
          >
            <ExternalLink size={14} />
            <span>View Live Portfolio</span>
          </a>
        </header>

        <div className="auth-form-container">
          <div className="auth-form-wrapper">
            <h1 className="auth-heading">Welcome back.</h1>
            <p className="auth-subheading">Sign in to manage your portfolio.</p>

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Admin Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <PasswordInput
                  id="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: '#111' }}
                  />
                  Remember me
                </label>

                <Link
                  to="/forgot-password"
                  style={{ fontSize: '13px', color: 'var(--admin-text-main)', textDecoration: 'none', fontWeight: 500 }}
                >
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
          </div>
        </div>
      </div>
    </div>
  );
};

