import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { PasswordInput } from '../components/PasswordInput';

export const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(true);
  const [tokenValid, setTokenValid] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setVerificationError('No reset token provided.');
      setVerifying(false);
      return;
    }

    api.get(`/auth/reset-password/${token}`)
      .then((res) => {
        if (res.data.success) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
        }
      })
      .catch((err) => {
        setTokenValid(false);
        setVerificationError(
          err.message || 'This password reset link is invalid, has expired (5-minute limit), or has already been used.'
        );
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      setStatus('loading');
      setMessage(null);
      const res = await api.post(`/auth/reset-password/${token}`, { password });
      setStatus('success');
      setMessage(res.data.message || 'Password successfully reset.');
      setTimeout(() => navigate('/login'), 2200);
    } catch (err: any) {
      setStatus('error');
      setMessage(
        err.message || 'Invalid or expired token. Please try again.'
      );
    }
  };

  return (
    <div className="auth-split-layout">
      {/* Left Branding Section */}
      <div className="auth-sidebar">
        <div className="auth-sidebar-top">
          <span className="auth-sidebar-title">Ronika Bhatia</span>
          <span className="auth-sidebar-subtitle">Admin Panel</span>
        </div>

        <div className="auth-sidebar-center">
          <div className="auth-sidebar-step">02</div>
          <div className="auth-sidebar-heading">Account Recovery</div>
          <div className="auth-sidebar-line"></div>
          <div className="auth-sidebar-desc">
            Set your new credentials.
          </div>
        </div>
      </div>

      {/* Right Authentication Section */}
      <div className="auth-main">
        <header className="auth-main-header">
          <Link to="/login" className="auth-link">
            <ArrowLeft size={14} />
            <span>Back to Login</span>
          </Link>
        </header>

        <div className="auth-form-container">
          <div className="auth-form-wrapper">
            {verifying ? (
              <div style={{ padding: '3rem 0', color: 'var(--admin-text-muted)', fontSize: '14px' }}>
                Verifying password reset link...
              </div>
            ) : !tokenValid ? (
              <>
                <h1 className="auth-heading">Link Expired or Used</h1>
                <p className="auth-subheading">
                  This password reset link is invalid, has expired, or has already been used.
                </p>
                <div className="alert-error" style={{ marginBottom: '24px' }}>
                  <AlertCircle size={16} />
                  <span>{verificationError || 'Password reset links are valid for 5 minutes and can only be used once. Please request a new link.'}</span>
                </div>
                <Link
                  to="/forgot-password"
                  className="auth-btn-primary"
                  style={{ display: 'inline-flex', textDecoration: 'none', justifyContent: 'center', width: 'auto', padding: '0.75rem 1.5rem' }}
                >
                  Request New Reset Link
                </Link>
              </>
            ) : status === 'success' ? (
              <>
                <h1 className="auth-heading">Password updated.</h1>
                <p className="auth-subheading">Your account is secure.</p>

                <div
                  style={{
                    padding: '1.25rem',
                    backgroundColor: '#f6fdf9',
                    border: '1px solid #c5e838',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '2rem',
                  }}
                >
                  <CheckCircle size={20} color="#65a30d" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ color: '#3f6212', fontSize: '14px', lineHeight: 1.5, fontWeight: 500, marginBottom: '4px' }}>
                      {message}
                    </div>
                    <div style={{ color: '#4d7c0f', fontSize: '12px' }}>
                      Redirecting to login...
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1 className="auth-heading">New Password</h1>
                <p className="auth-subheading">Enter your new secure password below.</p>

                {status === 'error' && message && (
                  <div className="alert-error" style={{ marginBottom: '24px' }}>
                    <AlertCircle size={16} />
                    <span>{message}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="password">
                      New Password
                    </label>
                    <PasswordInput
                      id="password"
                      className="form-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={status === 'loading'}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="confirmPassword">
                      Confirm New Password
                    </label>
                    <PasswordInput
                      id="confirmPassword"
                      className="form-input"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={status === 'loading'}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="auth-form-footer">
                    <button
                      type="submit"
                      className="auth-btn-primary"
                      disabled={status === 'loading'}
                    >
                      {status === 'loading' ? (
                        <span>Resetting...</span>
                      ) : (
                        <>
                          <span>Save New Password</span>
                          <ArrowRight size={16} className="arrow" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
