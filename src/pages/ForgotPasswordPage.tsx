import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setStatus('loading');
      setMessage(null);
      const res = await api.post('/auth/forgot-password', { email });
      setStatus('success');
      setMessage(res.data.message || "If an account exists for this email, we've sent instructions to reset your password.");
    } catch (err: any) {
      setStatus('error');
      setMessage(
        err.response?.data?.message || 'Something went wrong. Please try again.'
      );
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
          <div className="auth-sidebar-heading">Account Recovery</div>
          <div className="auth-sidebar-line"></div>
          <div className="auth-sidebar-desc">
            Secure access to your workspace.
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
          <Link to="/login" className="auth-link">
            <ArrowLeft size={14} />
            <span>Back to Login</span>
          </Link>
        </header>

        <div className="auth-form-container">
          <div className="auth-form-wrapper">
            <span className="auth-label-small">Admin Panel</span>
            
            {status === 'success' ? (
              <>
                <h1 className="auth-heading">Reset link sent.</h1>
                <p className="auth-subheading">Check your email.</p>

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
                  <span style={{ color: '#3f6212', fontSize: '14px', lineHeight: 1.5 }}>
                    {message}
                  </span>
                </div>

                <Link
                  to="/login"
                  className="auth-btn-primary"
                  style={{ justifyContent: 'center' }}
                >
                  Return to Sign In
                </Link>
              </>
            ) : (
              <>
                <h1 className="auth-heading">Forgot password?</h1>
                <p className="auth-subheading">Enter your admin email and we'll send you a secure password reset link.</p>

                {status === 'error' && message && (
                  <div className="alert-error" style={{ marginBottom: '24px' }}>
                    <AlertCircle size={16} />
                    <span>{message}</span>
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
                        <span>Sending link...</span>
                      ) : (
                        <>
                          <span>Send Reset Link</span>
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
