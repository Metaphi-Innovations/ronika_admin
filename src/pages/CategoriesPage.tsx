import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categoryApi';
import { ConfirmModal } from '../components/ConfirmModal';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { useAlert } from '../context/AlertContext';
import { useLiveResource } from '../context/LiveSyncContext';

interface ICategory {
  _id: string;
  name: string;
  slug: string;
  order?: number;
}

export const CategoriesPage: React.FC = () => {
  const alert = useAlert();
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ name: string; slug: string }>({
    name: '',
    slug: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const fetchCategories = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await getCategories();
      if (res.success) {
        setCategories(res.data);
      } else {
        setError('Failed to load categories');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading categories');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories(true);
  }, []);

  // Live CMS Synchronization for Categories
  useLiveResource(['categories'], () => {
    fetchCategories(false);
  });

  const handleEdit = (cat: ICategory) => {
    setIsCreating(false);
    setEditingId(cat._id);
    setSlugManuallyEdited(true);
    setFormData({
      name: cat.name,
      slug: cat.slug,
    });
  };

  const handleCreateNew = () => {
    setEditingId(null);
    setIsCreating(true);
    setSlugManuallyEdited(false);
    setFormData({
      name: '',
      slug: '',
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: '', slug: '' });
    setSlugManuallyEdited(false);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => {
      const updated = { ...prev, name: val };
      if (!slugManuallyEdited && isCreating) {
        updated.slug = val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      return updated;
    });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setFormData((prev) => ({
      ...prev,
      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name?.trim() || '';
    const trimmedSlug = formData.slug?.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '') || '';

    if (!trimmedName) {
      alert.warning('Please enter a category name.', 'Missing Category Name');
      return;
    }
    if (!trimmedSlug) {
      alert.warning('Please enter a URL slug for the category.', 'Missing URL Slug');
      return;
    }

    // Client-side duplicate name check (case-insensitive)
    const duplicateName = categories.find(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase() && c._id !== editingId
    );
    if (duplicateName) {
      alert.warning(
        `A category named "${trimmedName}" already exists. Please choose a different category name.`,
        'Duplicate Category Name'
      );
      return;
    }

    // Client-side duplicate slug check
    const duplicateSlug = categories.find(
      (c) => c.slug.trim().toLowerCase() === trimmedSlug && c._id !== editingId
    );
    if (duplicateSlug) {
      alert.warning(
        `The URL slug "${trimmedSlug}" is already in use by category "${duplicateSlug.name}". Please enter a unique slug.`,
        'Duplicate Slug'
      );
      return;
    }

    const payload = {
      ...formData,
      name: trimmedName,
      slug: trimmedSlug,
    };

    try {
      setSaving(true);
      if (isCreating) {
        await createCategory(payload);
        alert.success(`Category "${trimmedName}" created successfully!`, 'Category Created');
      } else if (editingId) {
        await updateCategory(editingId, payload);
        alert.success(`Category "${trimmedName}" updated successfully!`, 'Category Updated');
      }
      await fetchCategories();
      handleCancel();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to save category. Please check your inputs and try again.';
      alert.error(msg, 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteCategory(deleteTarget.id);
      await fetchCategories();
      alert.info(`Category "${deleteTarget.name}" deleted successfully.`, 'Category Deleted');
      setDeleteTarget(null);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete category. Please try again.';
      alert.error(msg, 'Delete Failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="PROJECT CATEGORIES"
        actions={
          !isCreating && !editingId ? (
            <button onClick={handleCreateNew} className="admin-btn primary">
              <Plus size={15} />
              <span>New Category</span>
            </button>
          ) : undefined
        }
      />

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#FFEBEE',
            color: 'var(--admin-danger)',
            borderRadius: '6px',
            marginBottom: '1.125rem',
            border: '1px solid #FFCDD2',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {(isCreating || editingId) && (
        <div style={{ marginBottom: '1.25rem' }}>
          <AdminSection
            title={isCreating ? 'CREATE CATEGORY' : 'EDIT CATEGORY'}
            actions={
              <button
                type="button"
                onClick={handleCancel}
                className="admin-btn-icon"
                title="Cancel"
              >
                <X size={15} />
              </button>
            }
          >
            <form onSubmit={handleSave}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '0.875rem',
                }}
              >
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label">Category Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleNameChange}
                    placeholder="e.g. Identity & Branding"
                    className="admin-form-input"
                    required
                  />
                </div>

                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label">
                    Slug * <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>(URL Path)</span>
                  </label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug || ''}
                    onChange={handleSlugChange}
                    placeholder="identity-and-branding"
                    className="admin-form-input"
                    required
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginTop: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--admin-border-color)',
                }}
              >
                <button
                  type="submit"
                  disabled={saving}
                  className="admin-btn primary"
                  style={{ fontSize: '13px', padding: '0.45rem 1.1rem' }}
                >
                  <Check size={14} /> {saving ? 'Saving...' : 'Save Category'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="admin-btn secondary"
                  style={{ fontSize: '13px', padding: '0.45rem 1rem' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </AdminSection>
        </div>
      )}

      <AdminSection noPadding>
        {loading ? (
          <div style={{ padding: '3.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-text-muted, #777)' }}>Loading categories...</span>
          </div>
        ) : categories.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <Layers
              size={32}
              color="var(--admin-border-color)"
              style={{ marginBottom: '0.5rem' }}
            />
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--admin-text-main)',
                marginBottom: '0.25rem',
              }}
            >
              No categories yet
            </h3>
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '12.5px', margin: '0 0 1rem 0' }}>
              Add a category to classify and filter portfolio projects.
            </p>
            <button
              onClick={handleCreateNew}
              className="admin-btn primary"
              style={{ fontSize: '13px' }}
            >
              <Plus size={14} /> Create Category
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-data-grid">
              <thead>
                <tr>
                  <th style={{ width: '65px' }}>S.No.</th>
                  <th>Category Name</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, index) => (
                  <tr key={cat._id}>
                    <td>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--admin-text-muted)',
                        }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '13.5px',
                          color: 'var(--admin-text-main)',
                        }}
                      >
                        {cat.name}
                      </div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--admin-text-muted)',
                          marginTop: '1px',
                          fontFamily: 'var(--admin-font-accent)',
                        }}
                      >
                        /{cat.slug}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <button
                          onClick={() => handleEdit(cat)}
                          className="admin-btn-icon"
                          title="Edit Category"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: cat._id, name: cat.name })}
                          className="admin-btn-icon danger"
                          title="Delete Category"
                        >
                          <Trash2 size={15} />
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
        title="Delete Category?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Projects assigned to this category will need reassignment.`}
        confirmLabel="Delete Category"
        isLoading={deleting}
        onConfirm={confirmDeleteCategory}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
