import React from 'react';
import { User, Mail, Shield, Clock, Calendar, Hash, LogOut, CheckCircle } from 'lucide-react';
import { AdminSection, PageHeader } from '../components/AdminSection';
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
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <PageHeader
        title="Admin Profile"
        subtitle="Manage your credentials, permissions, and administrative account details"
      />

      {/* Main Profile Overview Card */}
      <AdminSection>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'var(--admin-accent-pink, #E06E9B)',
              color: '#111111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '28px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
            }}
          >
            {initial}
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: 'var(--admin-text-main, #111111)' }}>
              {user.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '6px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  backgroundColor: user.role === 'admin' ? '#283593' : '#616161',
                  color: '#FFFFFF',
                }}
              >
                <Shield size={12} />
                {roleTitle}
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#2E7D32',
                }}
              >
                <CheckCircle size={12} />
                Active Account
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Attribute Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Email */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Mail size={14} color="#6B7280" />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                Email Address
              </span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{user.email}</div>
          </div>

          {/* Role */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Shield size={14} color="#6B7280" />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                Assigned Role
              </span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
              {user.role === 'admin' ? 'Administrator (Full Access)' : 'Editor (Content Only)'}
            </div>
          </div>

          {/* Last Login */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Clock size={14} color="#6B7280" />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                Last Login
              </span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{formatDate(user.lastLogin)}</div>
          </div>

          {/* Account Created */}
          {user.createdAt && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Calendar size={14} color="#6B7280" />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                  Member Since
                </span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{formatDate(user.createdAt)}</div>
            </div>
          )}

          {/* User ID */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Hash size={14} color="#6B7280" />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                Account ID
              </span>
            </div>
            <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#4B5563' }}>{user.id}</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#DC2626',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </AdminSection>
    </div>
  );
};
