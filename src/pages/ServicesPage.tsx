import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { getServices, createService, updateService, deleteService, IService } from '../services/serviceApi';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatusBadge } from '../components/StatusBadge';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { useAlert } from '../context/AlertContext';

export const ServicesPage: React.FC = () => {
  const alert = useAlert();
  const [services, setServices] = useState<IService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<IService>>({ title: '', description: '', icon: '', displayOrder: 0, isActive: true });
  const [isCreating, setIsCreating] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await getServices();
      if (res.success) {
        setServices(res.data);
      } else {
        setError('Failed to load services');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleEdit = (srv: IService) => {
    setIsCreating(false);
    setEditingId(srv._id);
    setFormData({ title: srv.title, description: srv.description, icon: srv.icon, displayOrder: srv.displayOrder, isActive: srv.isActive });
  };

  const handleCreateNew = () => {
    setEditingId(null);
    setIsCreating(true);
    setFormData({ title: '', description: '', icon: '', displayOrder: services.length, isActive: true });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ title: '', description: '', icon: '', displayOrder: 0, isActive: true });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: name === 'displayOrder' ? parseInt(value) || 0 : value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (isCreating) {
        await createService(formData);
        alert.success('Service created successfully!', 'Created');
      } else if (editingId) {
        await updateService(editingId, formData);
        alert.success('Service updated successfully!', 'Updated');
      }
      await fetchServices();
      handleCancel();
    } catch (err: any) {
      alert.error(err.message || 'Failed to save service', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteService = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteService(deleteTarget.id);
      await fetchServices();
      alert.success(`Service "${deleteTarget.title}" deleted successfully.`, 'Deleted');
      setDeleteTarget(null);
    } catch (err: any) {
      alert.error(err.message || 'Failed to delete service', 'Delete Failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Services"
        subtitle="Manage design, typography, and consultation service offerings."
        actions={
          !isCreating && !editingId ? (
            <button onClick={handleCreateNew} className="admin-btn primary">
              <Plus size={15} />
              <span>New Service</span>
            </button>
          ) : undefined
        }
      />

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#FFEBEE', color: 'var(--admin-danger)', borderRadius: '6px', marginBottom: '1.125rem', border: '1px solid #FFCDD2', fontSize: '13px', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <AdminSection
          title={isCreating ? 'Create New Service' : 'Edit Service'}
          actions={
            <button type="button" onClick={handleCancel} className="admin-btn-icon" title="Cancel">
              <X size={15} />
            </button>
          }
        >
          <form onSubmit={handleSave}>
            <div className="admin-two-col-grid">
              <div className="admin-form-group">
                <label className="admin-form-label">Title *</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} className="admin-form-input" required />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Icon Identifier (Optional)</label>
                <input type="text" name="icon" value={formData.icon || ''} onChange={handleChange} className="admin-form-input" placeholder="e.g. Layout, Type, Palette" />
              </div>
            </div>
            <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="admin-form-label" style={{ margin: 0 }}>Description *</label>
                <span style={{ fontSize: '11px', color: (formData.description || '').length >= 250 ? '#E65100' : 'var(--admin-text-muted)' }}>
                  {(formData.description || '').length} / 250 characters
                </span>
              </div>
              <textarea
                name="description"
                value={formData.description || ''}
                maxLength={250}
                onChange={(e) => {
                  const val = e.target.value.slice(0, 250);
                  setFormData((prev) => ({ ...prev, description: val }));
                }}
                className="admin-form-textarea"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <div className="admin-form-group" style={{ width: '150px', marginBottom: 0 }}>
                <label className="admin-form-label">Display Order</label>
                <input type="number" name="displayOrder" value={formData.displayOrder} onChange={handleChange} className="admin-form-input" required />
              </div>
              <label className="admin-switch-row" style={{ margin: 0, marginTop: '20px', cursor: 'pointer' }}>
                <input type="checkbox" name="isActive" checked={formData.isActive || false} onChange={handleChange} style={{ width: '16px', height: '16px', accentColor: '#111' }} />
                <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--admin-text-main)' }}>Active Status</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', paddingTop: '0.875rem', borderTop: '1px solid var(--admin-border-color)' }}>
              <button type="submit" disabled={saving} className="admin-btn primary">
                <Check size={15} /> {saving ? 'Saving...' : 'Save Service'}
              </button>
              <button type="button" onClick={handleCancel} disabled={saving} className="admin-btn secondary">
                Cancel
              </button>
            </div>
          </form>
        </AdminSection>
      )}

      <AdminSection noPadding>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Loading services...
          </div>
        ) : services.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <Wrench size={36} color="var(--admin-border-color)" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '0.25rem' }}>No services yet</h3>
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', margin: 0 }}>
              Add a service to showcase your offerings.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-data-grid">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Order</th>
                  <th>Service Title</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((srv) => (
                  <tr key={srv._id}>
                    <td>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-muted)' }}>{srv.displayOrder}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--admin-text-main)' }}>{srv.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginTop: '4px', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{srv.description}</div>
                    </td>
                    <td>
                      <StatusBadge status={srv.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleEdit(srv)}
                          className="admin-btn-icon"
                          title="Edit Service"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: srv._id, title: srv.title })}
                          className="admin-btn-icon danger"
                          title="Delete Service"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Service"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete Service"
        isLoading={deleting}
        onConfirm={confirmDeleteService}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
