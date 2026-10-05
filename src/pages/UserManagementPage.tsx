import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Shield,
  Eye,
  EyeOff,
  Power,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { userApi, CreateUserData, UpdateUserData } from '../services/userApi';
import { AdminUser } from '../types/auth';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmModal } from '../components/ConfirmModal';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { Loader } from '../components/Loader';
import { PasswordInput } from '../components/PasswordInput';
import { useAlert } from '../context/AlertContext';

export const SUPERADMIN_EMAIL = 'admin@ronikabhatia.com';

export const UserManagementPage: React.FC = () => {
  const alert = useAlert();
  const { user: currentUser } = useAuth();

  const isCurrentSuperAdmin =
    Boolean(currentUser?.email && currentUser.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase());

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [statusToggleTarget, setStatusToggleTarget] = useState<AdminUser | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Add User Form State
  const [newUserData, setNewUserData] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    isActive: false,
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  // Edit User Form State
  const [editFormData, setEditFormData] = useState<{
    name: string;
    email: string;
    role: 'admin' | 'editor';
    isActive: boolean;
    changePassword: boolean;
    newPassword: string;
    confirmNewPassword: string;
  }>({
    name: '',
    email: '',
    role: 'admin',
    isActive: true,
    changePassword: false,
    newPassword: '',
    confirmNewPassword: '',
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userApi.getUsers();
      setUsers(data);
    } catch (err: any) {
      const msg = err.message || 'Failed to load administrators.';
      alert.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Compute number of active full admins to know if final admin protection applies
  const activeAdminsCount = useMemo(() => {
    return users.filter(
      (u) => u.role === 'admin' && u.isActive
    ).length;
  }, [users]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateString;
    }
  };

  // --- ADD USER HANDLERS ---
  const handleOpenAddModal = () => {
    if (!isCurrentSuperAdmin) {
      alert.error('Access denied: Only Super Admin has permission to add new administrator accounts.');
      return;
    }
    setModalError(null);
    setNewUserData({
      name: '',
      email: '',
      password: '',
      role: 'admin',
      isActive: false,
    });
    setConfirmPassword('');
    setIsAddModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!newUserData.name.trim()) {
      setModalError('Full name is required.');
      return;
    }
    if (!newUserData.email.trim()) {
      setModalError('Valid email address is required.');
      return;
    }
    if (newUserData.password.length < 6) {
      setModalError('Password must be at least 6 characters.');
      return;
    }
    if (newUserData.password !== confirmPassword) {
      setModalError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await userApi.createUser({
        ...newUserData,
        email: newUserData.email.trim().toLowerCase(),
      });
      setIsAddModalOpen(false);
      alert.success('Administrator account created successfully.');
      await fetchUsers();
    } catch (err: any) {
      const msg = err.message || 'Failed to create user.';
      setModalError(msg);
      alert.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // --- EDIT USER HANDLERS ---
  const handleOpenEditModal = (target: AdminUser) => {
    const isTargetRonika = target.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
    const isSelf = currentUser?.id === target.id;

    if (!isCurrentSuperAdmin && !isSelf) {
      alert.error("Access denied: Only Super Admin has permission to edit another user's details.");
      return;
    }

    if (isTargetRonika && !isCurrentSuperAdmin) {
      alert.error('Protected account: Only Ronika can edit her administrator account.');
      return;
    }

    setModalError(null);
    setEditingUser(target);
    setEditFormData({
      name: target.name,
      email: target.email,
      role: target.role,
      isActive: target.isActive,
      changePassword: false,
      newPassword: '',
      confirmNewPassword: '',
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setModalError(null);

    if (!editFormData.name.trim()) {
      setModalError('Full name cannot be empty.');
      return;
    }
    if (!editFormData.email.trim()) {
      setModalError('Email address cannot be empty.');
      return;
    }

    if (editFormData.changePassword) {
      if (editFormData.newPassword.length < 6) {
        setModalError('New password must be at least 6 characters.');
        return;
      }
      if (editFormData.newPassword !== editFormData.confirmNewPassword) {
        setModalError('New passwords do not match.');
        return;
      }
    }

    const payload: UpdateUserData = {
      name: editFormData.name.trim(),
      email: editFormData.email.trim().toLowerCase(),
      role: editFormData.role,
      isActive: editFormData.isActive,
    };

    if (editFormData.changePassword && editFormData.newPassword) {
      payload.password = editFormData.newPassword;
    }

    try {
      setSubmitting(true);
      await userApi.updateUser(editingUser.id, payload);
      setEditingUser(null);
      alert.success('Administrator account updated successfully.');
      await fetchUsers();
    } catch (err: any) {
      const msg = err.message || 'Failed to update user.';
      setModalError(msg);
      alert.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // --- TOGGLE STATUS HANDLER ---
  const handleConfirmToggleStatus = async () => {
    if (!statusToggleTarget) return;

    if (!isCurrentSuperAdmin) {
      alert.error('Access denied: Only Super Admin has permission to activate or deactivate administrator accounts.');
      setStatusToggleTarget(null);
      return;
    }

    const isTargetRonika = statusToggleTarget.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
    if (isTargetRonika) {
      alert.error('Protected account: The primary administrator account cannot be deactivated.');
      setStatusToggleTarget(null);
      return;
    }

    try {
      setSubmitting(true);
      const newStatus = !statusToggleTarget.isActive;
      await userApi.toggleUserStatus(statusToggleTarget.id, newStatus);
      setStatusToggleTarget(null);
      alert.success(`Administrator account ${newStatus ? 'activated' : 'deactivated'} successfully.`);
      await fetchUsers();
    } catch (err: any) {
      const msg = err.message || 'Failed to toggle status.';
      alert.error(msg);
      setStatusToggleTarget(null);
    } finally {
      setSubmitting(false);
    }
  };

  // --- DELETE HANDLER ---
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (!isCurrentSuperAdmin) {
      alert.error('Access denied: Only Super Admin has permission to delete administrator accounts.');
      setDeleteTarget(null);
      return;
    }

    const isTargetRonika = deleteTarget.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
    if (isTargetRonika) {
      alert.error('Protected account: The primary administrator account cannot be deleted.');
      setDeleteTarget(null);
      return;
    }

    try {
      setSubmitting(true);
      await userApi.deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      alert.info('Administrator account permanently removed.');
      await fetchUsers();
    } catch (err: any) {
      const msg = err.message || 'Failed to delete user.';
      alert.error(msg);
      setDeleteTarget(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-users-page">
      {/* Page Header */}
      <PageHeader
        title="USER MANAGEMENT"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="admin-btn secondary"
              title="Refresh Users"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            {isCurrentSuperAdmin && (
              <button onClick={handleOpenAddModal} className="admin-btn primary">
                <Plus size={15} />
                <span>Add Administrator</span>
              </button>
            )}
          </div>
        }
      />

      {/* Users Data Grid Card */}
      <AdminSection title="ADMINISTRATOR ACCOUNTS" noPadding>
        {loading ? (
          <Loader text="Loading administrators..." minHeight="200px" />
        ) : users.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <Users
              size={36}
              color="var(--admin-border-color)"
              style={{ marginBottom: '0.75rem' }}
            />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '0.25rem' }}>
              No users yet
            </h3>
            <p
              style={{
                color: 'var(--admin-text-muted)',
                marginBottom: '1.25rem',
                fontSize: '13px',
              }}
            >
              Add an administrator or editor to manage the CMS.
            </p>
            <button onClick={handleOpenAddModal} className="admin-btn primary">
              <Plus size={15} />
              Add User
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="admin-data-grid" style={{ minWidth: '750px' }}>
              <thead>
                <tr>
                  <th>Administrator</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Last Login</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((target) => {
                  const isSelf = currentUser?.id === target.id;
                  const isFullAdmin = target.role === 'admin';
                  const isFinalAdmin = isFullAdmin && target.isActive && activeAdminsCount <= 1;
                  const isTargetSuperAdmin = target.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();

                  // Permission flags:
                  // Only Super Admin can edit other users' details; standard admin can only edit their own account.
                  const canEdit = isCurrentSuperAdmin || isSelf;
                  const canToggle = isCurrentSuperAdmin && !isSelf && !isTargetSuperAdmin && !(target.isActive && isFinalAdmin);
                  const canDelete = isCurrentSuperAdmin && !isSelf && !isTargetSuperAdmin && !isFinalAdmin;

                  return (
                    <tr key={target.id}>
                      {/* Name & Email */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: '14px',
                              color: 'var(--admin-text-main)',
                            }}
                          >
                            {target.name}
                          </span>
                          {isSelf && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                background: '#E3F2FD',
                                color: '#1976D2',
                                borderRadius: '4px',
                                letterSpacing: '0.04em',
                              }}
                            >
                              You
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--admin-text-muted)',
                            marginTop: '2px',
                          }}
                        >
                          {target.email}
                        </div>
                      </td>

                      {/* Role Badge - Explicit Distinction for Super Admin vs Admin vs Editor */}
                      <td>
                        {isTargetSuperAdmin ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: '#EDE7F6',
                              color: '#4527A0',
                              letterSpacing: '0.02em',
                            }}
                          >
                            <Shield size={12} color="#5E35B1" />
                            Super Admin
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: target.role === 'admin' ? '#E8EAF6' : '#F5F5F5',
                              color: target.role === 'admin' ? '#283593' : '#616161',
                              textTransform: 'capitalize',
                            }}
                          >
                            <Shield size={12} />
                            {target.role === 'admin' ? 'Admin' : 'Editor'}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <StatusBadge
                          status={target.isActive ? 'active' : 'inactive'}
                          label={target.isActive ? 'Active' : 'Inactive'}
                        />
                      </td>

                      {/* Created Date */}
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                          {formatDate(target.createdAt)}
                        </span>
                      </td>

                      {/* Last Login */}
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                          {formatDate(target.lastLogin)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.5rem',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                          }}
                        >
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEditModal(target)}
                              className="admin-btn-icon"
                              title={isSelf ? 'Edit Your Account' : `Edit ${target.name}`}
                              aria-label={`Edit ${target.name}`}
                            >
                              <Edit2 size={16} />
                            </button>
                          )}

                          {canToggle && (
                            <button
                              onClick={() => setStatusToggleTarget(target)}
                              className={`admin-btn-icon ${
                                target.isActive ? 'warning' : 'success'
                              }`}
                              title={target.isActive ? 'Deactivate account' : 'Activate account'}
                              style={{ color: target.isActive ? '#E65100' : '#2E7D32' }}
                              aria-label={`${target.isActive ? 'Deactivate' : 'Activate'} ${target.name}`}
                            >
                              <Power size={16} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget(target)}
                              className="admin-btn-icon danger"
                              title="Delete Administrator"
                              aria-label={`Delete ${target.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}

                          {!canEdit && !canToggle && !canDelete && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: 'var(--admin-text-muted)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                background: '#F5F5F3',
                                borderRadius: '4px',
                              }}
                            >
                              <Lock size={11} /> View only
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      {/* ========================================================================= */}
      {/* ADD USER MODAL                                                            */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', width: '92%' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="var(--admin-text-main)" />
                <h3 className="modal-title" style={{ margin: 0 }}>
                  Add New Administrator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                disabled={submitting}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} autoComplete="off">
              {/* Dummy hidden inputs to intercept aggressive browser credential autofill */}
              <input type="text" name="fake_username_remembered" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_password_remembered" style={{ display: 'none' }} tabIndex={-1} autoComplete="new-password" />

              <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {modalError && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      background: '#FFEBEE',
                      color: 'var(--admin-danger)',
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
                    name="new_admin_full_name"
                    autoComplete="off"
                    value={newUserData.name}
                    onChange={(e) =>
                      setNewUserData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g. Ronika Bhatia"
                    className="admin-form-input"
                    required
                  />
                </div>

                {/* Email */}
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label">Email Address *</label>
                  <input
                    type="email"
                    name="new_admin_account_email"
                    autoComplete="new-password"
                    value={newUserData.email}
                    onChange={(e) =>
                      setNewUserData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="name@ronikabhatia.com"
                    className="admin-form-input"
                    required
                  />
                </div>

                {/* Role */}
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label">Role *</label>
                  <select
                    value={newUserData.role}
                    onChange={(e) =>
                      setNewUserData((prev) => ({
                        ...prev,
                        role: e.target.value as 'admin' | 'editor',
                      }))
                    }
                    className="admin-form-input"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="admin">Administrator (Full Access & User Management)</option>
                    <option value="editor">Editor (Content & Media Management Only)</option>
                  </select>
                </div>

                {/* Password */}
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label">Password * (Min. 6 characters)</label>
                  <PasswordInput
                    name="new_admin_account_password"
                    autoComplete="new-password"
                    value={newUserData.password}
                    onChange={(e) =>
                      setNewUserData((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="••••••••"
                    required
                  />
                </div>

                {/* Confirm Password */}
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label">Confirm Password *</label>
                  <PasswordInput
                    name="new_admin_account_confirm_password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginTop: '0.25rem' }}>
                  <input
                    type="checkbox"
                    id="new-user-active"
                    checked={newUserData.isActive}
                    onChange={(e) =>
                      setNewUserData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label
                    htmlFor="new-user-active"
                    style={{ fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Active Account (Can log into CMS immediately)
                  </label>
                </div>
              </div>

              <div
                className="modal-footer"
                style={{
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  borderTop: '1px solid var(--admin-border-color)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submitting}
                  className="admin-btn secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="admin-btn primary">
                  {submitting ? 'Creating User...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT USER MODAL                                                           */}
      {/* ========================================================================= */}
      {editingUser && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', width: '92%' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={18} color="var(--admin-text-main)" />
                <h3 className="modal-title" style={{ margin: 0 }}>
                  Edit Administrator: {editingUser.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                disabled={submitting}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} autoComplete="off">
              {/* Dummy hidden inputs to intercept aggressive browser credential autofill */}
              <input type="text" name="fake_edit_username_remembered" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_edit_password_remembered" style={{ display: 'none' }} tabIndex={-1} autoComplete="new-password" />

              <div
                className="modal-body"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  maxHeight: '75vh',
                  overflowY: 'auto',
                }}
              >
                {modalError && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      background: '#FFEBEE',
                      color: 'var(--admin-danger)',
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
                    name="edit_admin_full_name"
                    autoComplete="off"
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="admin-form-input"
                    required
                  />
                </div>

                {/* Email */}
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label">Email Address *</label>
                  <input
                    type="email"
                    name="edit_admin_email_field"
                    autoComplete="off"
                    value={editFormData.email}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="admin-form-input"
                    required
                  />
                </div>

                {/* Role */}
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label">Role</label>
                  {isCurrentSuperAdmin && editingUser.email.toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase() ? (
                    <select
                      value={editFormData.role}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          role: e.target.value as 'admin' | 'editor',
                        }))
                      }
                      className="admin-form-input"
                    >
                      <option value="admin">Administrator</option>
                      <option value="editor">Editor</option>
                    </select>
                  ) : (
                    <div
                      style={{
                        padding: '8px 12px',
                        background: '#F5F5F3',
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: 'var(--admin-text-main)',
                        fontWeight: 500,
                      }}
                    >
                      {editingUser.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()
                        ? 'Super Admin'
                        : editingUser.role === 'admin'
                        ? 'Administrator'
                        : 'Editor'}
                    </div>
                  )}
                </div>

                {/* Status Toggle - Only visible & editable for Super Admin editing other accounts */}
                {isCurrentSuperAdmin &&
                  editingUser.email.toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase() &&
                  currentUser?.id !== editingUser.id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <input
                        type="checkbox"
                        id="edit-user-active"
                        checked={editFormData.isActive}
                        onChange={(e) =>
                          setEditFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                        }
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label
                        htmlFor="edit-user-active"
                        style={{ fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Active Account
                      </label>
                    </div>
                  )}

                {/* Change Password Section */}
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    background: '#FAFAF8',
                    border: '1px solid var(--admin-border-color)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: editFormData.changePassword ? '1rem' : 0 }}>
                    <input
                      type="checkbox"
                      id="change-password-toggle"
                      checked={editFormData.changePassword}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          changePassword: e.target.checked,
                          newPassword: '',
                          confirmNewPassword: '',
                        }))
                      }
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label
                      htmlFor="change-password-toggle"
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Lock size={14} />
                      Set New Password
                    </label>
                  </div>

                  {editFormData.changePassword && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      <div className="admin-form-group" style={{ margin: 0 }}>
                        <label className="admin-form-label">New Password (Min. 6 chars)</label>
                        <PasswordInput
                          name="edit_admin_new_password"
                          autoComplete="new-password"
                          value={editFormData.newPassword}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              newPassword: e.target.value,
                            }))
                          }
                          placeholder="Enter new password"
                          required={editFormData.changePassword}
                        />
                      </div>

                      <div className="admin-form-group" style={{ margin: 0 }}>
                        <label className="admin-form-label">Confirm New Password</label>
                        <PasswordInput
                          name="edit_admin_confirm_password"
                          autoComplete="new-password"
                          value={editFormData.confirmNewPassword}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              confirmNewPassword: e.target.value,
                            }))
                          }
                          placeholder="Repeat new password"
                          required={editFormData.changePassword}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="modal-footer"
                style={{
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  borderTop: '1px solid var(--admin-border-color)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={submitting}
                  className="admin-btn secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="admin-btn primary">
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOGGLE STATUS CONFIRM MODAL                                               */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={Boolean(statusToggleTarget)}
        title={
          statusToggleTarget?.isActive
            ? 'Deactivate User?'
            : 'Activate User?'
        }
        message={
          statusToggleTarget?.isActive
            ? `Are you sure you want to deactivate "${statusToggleTarget?.name}"?`
            : `Are you sure you want to activate "${statusToggleTarget?.name}"?`
        }
        confirmLabel={
          statusToggleTarget?.isActive ? 'Deactivate' : 'Activate'
        }
        isDanger={Boolean(statusToggleTarget?.isActive)}
        isLoading={submitting}
        onConfirm={handleConfirmToggleStatus}
        onClose={() => setStatusToggleTarget(null)}
      />

      {/* ========================================================================= */}
      {/* DELETE CONFIRM MODAL                                                      */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete User?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete User"
        isDanger={true}
        isLoading={submitting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default UserManagementPage;
