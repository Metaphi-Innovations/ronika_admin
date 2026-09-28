import React from 'react';
import { X, Shield, Mail, Calendar, Clock, LogOut, CheckCircle, Hash } from 'lucide-react';
import { AdminUser } from '../types/auth';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onLogout: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
}) => {
  if (!isOpen || !user) return null;

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

  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'A';
  const roleName = user.role === 'admin' ? 'Administrator' : 'Editor';

  return (
    <div
      className="admin-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="admin-modal-container"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'adminModalIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
            padding: '1.5rem',
            position: 'relative',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: 'var(--admin-accent-pink, #E06E9B)',
                color: '#111111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '22px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              }}
            >
              {initial}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>
                {user.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: user.role === 'admin' ? '#283593' : '#616161',
                    color: '#FFFFFF',
                  }}
                >
                  <Shield size={10} />
                  {roleName}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#A5D6A7',
                  }}
                >
                  <CheckCircle size={10} />
                  Active
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            title="Close profile"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body / Details */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Account Details
          </div>

          {/* Email */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              padding: '0.75rem',
              background: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #EEEEEE',
            }}
          >
            <Mail size={16} color="#666" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>Email Address</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{user.email}</span>
            </div>
          </div>

          {/* Role & Permissions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              padding: '0.75rem',
              background: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #EEEEEE',
            }}
          >
            <Shield size={16} color="#666" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>Role & Permissions</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>
                {user.role === 'admin'
                  ? 'Administrator (Full CMS & User Management Access)'
                  : 'Editor (Content, Projects & Media Management)'}
              </span>
            </div>
          </div>

          {/* Last Login */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              padding: '0.75rem',
              background: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #EEEEEE',
            }}
          >
            <Clock size={16} color="#666" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>Last Login</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}>{formatDate(user.lastLogin)}</span>
            </div>
          </div>

          {/* Member Since (Created At) */}
          {user.createdAt && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                padding: '0.75rem',
                background: '#F9FAFB',
                borderRadius: '8px',
                border: '1px solid #EEEEEE',
              }}
            >
              <Calendar size={16} color="#666" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>Member Since</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}>{formatDate(user.createdAt)}</span>
              </div>
            </div>
          )}

          {/* User ID */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              padding: '0.75rem',
              background: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #EEEEEE',
            }}
          >
            <Hash size={16} color="#666" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>Administrator ID</span>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#555' }}>{user.id}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: '#F4F5F7',
            borderTop: '1px solid #EEEEEE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            onClick={onLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#D32F2F',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut size={14} />
            Logout
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              backgroundColor: '#111111',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.15s ease',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
