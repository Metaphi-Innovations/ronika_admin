import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit, Trash2, X, Check, EyeOff } from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categoryApi';

interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  order: number;
}

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ICategory>>({ name: '', slug: '', description: '', order: 0 });
  const [isCreating, setIsCreating] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await getCategories();
      if (res.success) {
        setCategories(res.data);
      } else {
        setError('Failed to load categories');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEdit = (cat: ICategory) => {
    setIsCreating(false);
    setEditingId(cat._id);
    setFormData({ name: cat.name, slug: cat.slug, description: cat.description, order: cat.order });
  };

  const handleCreateNew = () => {
    setEditingId(null);
    setIsCreating(true);
    setFormData({ name: '', slug: '', description: '', order: categories.length });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: '', slug: '', description: '', order: 0 });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'order' ? parseInt(value) || 0 : value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (isCreating) {
        await createCategory(formData);
      } else if (editingId) {
        await updateCategory(editingId, formData);
      }
      await fetchCategories();
      handleCancel();
    } catch (err: any) {
      alert(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteCategory(id);
        await fetchCategories();
      } catch (err: any) {
        alert(err.message || 'Failed to delete category');
      }
    }
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Categories Management</h1>
          <p style={{ color: 'var(--admin-text-muted)', margin: '0.25rem 0 0 0', fontSize: '14px' }}>
            Manage project classification tags and filter criteria.
          </p>
        </div>
        {!isCreating && !editingId && (
          <button onClick={handleCreateNew} className="admin-btn primary">
            <Plus size={16} />
            New Category
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
            <h2 className="admin-card-title">{isCreating ? 'Create New Category' : 'Edit Category'}</h2>
            <button type="button" onClick={handleCancel} className="admin-btn-icon" title="Cancel">
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem' }}>
            <div className="admin-form-group">
              <label className="admin-form-label">Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="admin-form-input" required />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Slug</label>
              <input type="text" name="slug" value={formData.slug} onChange={handleChange} className="admin-form-input" required />
            </div>
          </div>
          <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="admin-form-label">Description (Optional)</label>
            <input type="text" name="description" value={formData.description || ''} onChange={handleChange} className="admin-form-input" />
          </div>
          <div className="admin-form-group" style={{ width: '150px' }}>
            <label className="admin-form-label">Display Order</label>
            <input type="number" name="order" value={formData.order} onChange={handleChange} className="admin-form-input" required />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="submit" disabled={saving} className="admin-btn primary">
              <Check size={16} /> {saving ? 'Saving...' : 'Save Category'}
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
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
            <Layers size={48} color="var(--admin-border-color)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem' }}>No categories found</h3>
            <p style={{ color: 'var(--admin-text-muted)', marginBottom: '1.5rem', fontSize: '14px' }}>
              You haven't added any categories yet.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-data-grid">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Order</th>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat._id}>
                    <td>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-muted)' }}>{cat.order}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--admin-text-main)' }}>{cat.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px', fontFamily: 'var(--admin-font-accent)' }}>/{cat.slug}</div>
                    </td>
                    <td>
                      {cat.description ? (
                        <span style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>{cat.description}</span>
                      ) : (
                        <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--admin-text-light)' }}>No description</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleEdit(cat)}
                          className="admin-btn-icon"
                          title="Edit Category"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat._id, cat.name)}
                          className="admin-btn-icon danger"
                          title="Delete Category"
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
