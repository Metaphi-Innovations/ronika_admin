import React, { useState } from 'react';
import {
  Mail,
  Shield,
  Clock,
  Calendar,
  Hash,
  CheckCircle,
  Edit2,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/userApi';
import { useAlert } from '../context/AlertContext';
import { PasswordInput } from '../components/PasswordInput';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const alert = useAlert();

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [changePassword, setChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleOpenEditModal = () => {
    if (!user) return;
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setChangePassword(false);
    setNewPassword('');
    setConfirmPassword('');
    setModalError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!editName.trim()) {
      setModalError('Full name cannot be empty.');
      return;
    }

    if (!editEmail.trim()) {
      setModalError('Email address cannot be empty.');
      return;
    }

    if (changePassword) {
      if (!newPassword || newPassword.length < 6) {
        setModalError('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setModalError('Passwords do not match.');
        return;
      }
    }

    try {
      setSaving(true);
      setModalError(null);

      const payload: { name: string; email: string; password?: string } = {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
      };

      if (changePassword && newPassword.trim()) {
        payload.password = newPassword.trim();
      }

      const updated = await userApi.updateUser(user.id, payload);

      // Instantly update AuthContext so topbar, profile, and localStorage synchronize
      updateUser(updated);

      alert.success('Profile details updated successfully.');
      setIsEditModalOpen(false);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to update profile. Please try again.';
      setModalError(msg);
    } finally {
      setSaving(false);
    }
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
      {/* Subtitle */}
      <div>
        <p style={{ margin: '0', fontSize: '13px', color: 'var(--admin-text-muted, #6B7280)' }}>
          Manage your credentials, permissions, and administrative account details
        </p>
      </div>

      {/* Main Profile Card with Edit and Sign Out */}
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

          {/* Action Button: Edit Profile */}
          <div>
            <button
              type="button"
              onClick={handleOpenEditModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: '#111111',
                border: '1px solid #111111',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#333333')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111111')}
            >
              <Edit2 size={13} />
              Edit Profile
            </button>
          </div>
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

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => !saving && setIsEditModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', width: '92%' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={16} color="var(--admin-text-main, #111111)" />
                <h3 className="modal-title" style={{ margin: 0, fontSize: '15px' }}>
                  Edit Admin Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={saving}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} autoComplete="off">
              {/* Dummy hidden inputs to intercept aggressive browser credential autofill */}
              <input type="text" name="fake_username_remembered" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_password_remembered" style={{ display: 'none' }} tabIndex={-1} autoComplete="new-password" />

              <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {modalError && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      background: '#FFEBEE',
                      color: 'var(--admin-danger, #E53935)',
                      borderRadius: '6px',
                      fontSize: '13px',
                      border: '1px solid #FFCDD2',
                    }}
                  >
                    {modalError}
                  </div>
                )}

                {/* Name */}
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label">Full Name *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Ronika Bhatia"
                    className="admin-form-input"
                    required
                    disabled={saving}
                  />
                </div>

                {/* Email */}
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label">Email Address *</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="admin@ronikabhatia.com"
                    className="admin-form-input"
                    required
                    disabled={saving}
                  />
                </div>

                {/* Password Change Toggle */}
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.875rem', marginTop: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main, #111)' }}>
                    <input
                      type="checkbox"
                      checked={changePassword}
                      onChange={(e) => {
                        setChangePassword(e.target.checked);
                        if (!e.target.checked) {
                          setNewPassword('');
                          setConfirmPassword('');
                        }
                      }}
                      disabled={saving}
                      style={{ accentColor: '#111111' }}
                    />
                    Change Password
                  </label>

                  {changePassword && (
                    <div style={{ marginTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      <div className="admin-form-group" style={{ margin: 0 }}>
                        <label className="admin-form-label">New Password (min. 6 characters) *</label>
                        <PasswordInput
                          name="profile_edit_new_password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new secure password"
                          required={changePassword}
                          disabled={saving}
                          autoComplete="new-password"
                        />
                      </div>

                      <div className="admin-form-group" style={{ margin: 0 }}>
                        <label className="admin-form-label">Confirm New Password *</label>
                        <PasswordInput
                          name="profile_edit_confirm_password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          required={changePassword}
                          disabled={saving}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={saving}
                  className="admin-btn secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="admin-btn primary"
                >
                  {saving ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
