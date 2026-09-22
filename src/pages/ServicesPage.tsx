import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Edit, Trash2, X, Check, EyeOff } from 'lucide-react';
import { getServices, createService, updateService, deleteService, IService } from '../services/serviceApi';

export const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<IService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
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
      } else if (editingId) {
        await updateService(editingId, formData);
      }
      await fetchServices();
      handleCancel();
    } catch (err: any) {
      alert(err.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteService(id);
        await fetchServices();
      } catch (err: any) {
        alert(err.message || 'Failed to delete service');
      }
    }
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Services Management</h1>
          <p style={{ color: 'var(--admin-text-muted)', margin: '0.25rem 0 0 0', fontSize: '14px' }}>
            Update offered design disciplines, consulting services, and expertise listings.
          </p>
        </div>
        {!isCreating && !editingId && (
          <button onClick={handleCreateNew} className="admin-btn primary">
            <Plus size={16} />
            New Service
          </button>
        )}
      </header>

      {error && (
        <div style={{ padding: '1rem', background: '#FFEBEE', color: 'var(--admin-danger)', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #FFCDD2', fontSize: '13px', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <form onSubmit={handleSave} className="admin-card" style={{ marginBottom: '2rem', padding: '2rem' }}>
          <div className="admin-card-header">
            <h2 className="admin-card-title">{isCreating ? 'Create New Service' : 'Edit Service'}</h2>
            <button type="button" onClick={handleCancel} className="admin-btn-icon" title="Cancel">
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem' }}>
            <div className="admin-form-group">
              <label className="admin-form-label">Title</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} className="admin-form-input" required />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Icon Identifier (Optional)</label>
              <input type="text" name="icon" value={formData.icon || ''} onChange={handleChange} className="admin-form-input" placeholder="e.g. Layout, Type, Palette" />
            </div>
          </div>
          <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="admin-form-label">Description</label>
            <textarea name="description" value={formData.description || ''} onChange={handleChange} className="admin-form-textarea" required />
          </div>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div className="admin-form-group" style={{ width: '150px', marginBottom: 0 }}>
              <label className="admin-form-label">Display Order</label>
              <input type="number" name="displayOrder" value={formData.displayOrder} onChange={handleChange} className="admin-form-input" required />
            </div>
            <label className="admin-switch-row" style={{ margin: 0, marginTop: '20px', cursor: 'pointer' }}>
              <input type="checkbox" name="isActive" checked={formData.isActive || false} onChange={handleChange} style={{ width: '16px', height: '16px', accentColor: '#111' }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--admin-text-main)' }}>Active Status</span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--admin-border-color)' }}>
            <button type="submit" disabled={saving} className="admin-btn primary">
              <Check size={16} /> {saving ? 'Saving...' : 'Save Service'}
            </button>
            <button type="button" onClick={handleCancel} disabled={saving} className="admin-btn secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Loading services...
          </div>
        ) : services.length === 0 ? (
          <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
            <Wrench size={48} color="var(--admin-border-color)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem' }}>No services found</h3>
            <p style={{ color: 'var(--admin-text-muted)', marginBottom: '1.5rem', fontSize: '14px' }}>
              You haven't added any services yet.
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
                      {srv.isActive ? (
                        <span className="status-badge published">
                          Active
                        </span>
                      ) : (
                        <span className="status-badge draft">
                          <EyeOff size={10} style={{ marginRight: '4px' }} /> Inactive
                        </span>
                      )}
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
                          onClick={() => handleDelete(srv._id, srv.title)}
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
      </div>
    </div>
  );
};
