import React from 'react';
import { Mail, Shield, Clock, Calendar, Hash, LogOut, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Never';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  if (!user) return null;

  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'A';
  const roleTitle = user.role === 'admin' ? 'Administrator' : 'Editor';

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Compact Page Title */}
      <div>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--admin-text-main, #111111)' }}>
          Admin Profile
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>
          Manage your credentials, permissions, and administrative account details
        </p>
      </div>

      {/* Main Profile Card with Integrated Sign Out */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--admin-border-color, #E5E7EB)',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* User Summary Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: 'var(--admin-accent-pink, #E06E9B)',
                color: '#111111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '18px',
                flexShrink: 0,
              }}
            >
              {initial}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  {user.name}
                </h2>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: user.role === 'admin' ? '#283593' : '#616161',
                    color: '#FFFFFF',
                  }}
                >
                  <Shield size={10} />
                  {roleTitle}
                </span>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#2E7D32',
                  }}
                >
                  <CheckCircle size={11} />
                  Active Account
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px', display: 'block' }}>
                {user.email}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #FECACA',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#DC2626',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>

        {/* Compact Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.625rem',
          }}
        >
          {/* Email */}
          <div
            style={{
              padding: '0.55rem 0.75rem',
              backgroundColor: '#F9FAFB',
              borderRadius: '6px',
              border: '1px solid #F3F4F6',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2px' }}>
              <Mail size={12} color="#6B7280" />
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Email Address
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', wordBreak: 'break-all' }}>{user.email}</div>
          </div>

          {/* Role */}
          <div
            style={{
              padding: '0.55rem 0.75rem',
              backgroundColor: '#F9FAFB',
              borderRadius: '6px',
              border: '1px solid #F3F4F6',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2px' }}>
              <Shield size={12} color="#6B7280" />
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Assigned Role
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
              {user.role === 'admin' ? 'Administrator (Full Access)' : 'Editor (Content Only)'}
            </div>
          </div>

          {/* Last Login */}
          <div
            style={{
              padding: '0.55rem 0.75rem',
              backgroundColor: '#F9FAFB',
              borderRadius: '6px',
              border: '1px solid #F3F4F6',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2px' }}>
              <Clock size={12} color="#6B7280" />
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Last Login
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{formatDate(user.lastLogin)}</div>
          </div>

          {/* Account Created */}
          {user.createdAt && (
            <div
              style={{
                padding: '0.55rem 0.75rem',
                backgroundColor: '#F9FAFB',
                borderRadius: '6px',
                border: '1px solid #F3F4F6',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2px' }}>
                <Calendar size={12} color="#6B7280" />
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Member Since
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{formatDate(user.createdAt)}</div>
            </div>
          )}

          {/* Account ID */}
          <div
            style={{
              padding: '0.55rem 0.75rem',
              backgroundColor: '#F9FAFB',
              borderRadius: '6px',
              border: '1px solid #F3F4F6',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2px' }}>
              <Hash size={12} color="#6B7280" />
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Account ID
              </span>
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#4B5563' }}>{user.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
