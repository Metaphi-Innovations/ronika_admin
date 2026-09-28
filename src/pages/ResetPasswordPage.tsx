import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(true);
  const [tokenValid, setTokenValid] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
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
      .catch(() => {
        setTokenValid(false);
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
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setStatus('error');
      setMessage(
        err.response?.data?.message || 'Invalid or expired token. Please try again.'
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

        <div className="auth-sidebar-bottom">
          <span>Ronika Bhatia Digital Portfolio</span>
          <span style={{ color: '#555' }}>&copy; 2026</span>
        </div>
      </div>

      {/* Right Authentication Section */}
      <div className="auth-main">
        <div className="auth-form-container">
          <div className="auth-form-wrapper">
            <span className="auth-label-small">Admin Panel</span>
            
            {verifying ? (
              <div style={{ padding: '3rem 0', color: 'var(--admin-text-muted)', fontSize: '14px' }}>
                Verifying password reset link...
              </div>
            ) : !tokenValid ? (
              <>
                <h1 className="auth-heading">Link Expired</h1>
                <p className="auth-subheading">This password reset link is invalid or has already been used.</p>
                <div className="alert-error" style={{ marginBottom: '24px' }}>
                  <AlertCircle size={16} />
                  <span>Password reset links can only be used once within 30 minutes. Please request a new link.</span>
                </div>
                <Link to="/forgot-password" className="auth-btn-primary" style={{ display: 'inline-flex', textDecoration: 'none', justifyContent: 'center', width: 'auto', padding: '0.75rem 1.5rem' }}>
                  Request New Reset Link
                </Link>
              </>
            ) : status === 'success' ? (
              <>
                <h1 className="auth-heading">Password updated.</h1>
                <p className="auth-subheading">Your account is secure.</p>

                <div style={{
                  padding: '1.25rem',
                  backgroundColor: '#f6fdf9',
                  border: '1px solid #c5e838',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '2rem'
                }}>
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
                    <input
                      id="password"
                      type="password"
                      className="form-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={status === 'loading'}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="confirmPassword">
                      Confirm New Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      className="form-input"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={status === 'loading'}
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

            <div style={{ marginTop: '3rem', fontSize: '11px', color: 'var(--admin-text-light)', fontFamily: 'var(--admin-font-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ronika Bhatia Admin Panel
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
