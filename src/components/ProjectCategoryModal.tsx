import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Check, Loader2 } from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory, ICategory } from '../services/projectApi';
import { useAlert } from '../context/AlertContext';

interface ProjectCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectCategoryModal: React.FC<ProjectCategoryModalProps> = ({ isOpen, onClose }) => {
  const alert = useAlert();
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) fetchCategories();
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await getCategories();
      if (res.success) {
        setCategories(res.data || []);
      }
    } catch (err: any) {
      alert.error(err.message || "We couldn't load the content. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim() || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const res = await createCategory(newCategory.trim());
      if (res.success) {
        setCategories([...categories, res.data]);
        setNewCategory('');
        alert.success(`Category "${res.data.name}" created.`);
      }
    } catch (err: any) {
      alert.error(err.message || "We couldn't save this category. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim() || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const res = await updateCategory(id, editName.trim());
      if (res.success) {
        setCategories(categories.map(c => c._id === id ? res.data : c));
        setEditingId(null);
        alert.success(`Category renamed to "${res.data.name}".`);
      }
    } catch (err: any) {
      alert.error(err.message || "We couldn't update this category. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await alert.confirm({
      title: 'Delete Category?',
      message: `Are you sure you want to delete the category "${name}"?`,
      confirmLabel: 'Delete',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      const res = await deleteCategory(id);
      if (res.success) {
        setCategories(categories.filter(c => c._id !== id));
        alert.info(`Category "${name}" deleted.`);
      }
    } catch (err: any) {
      alert.error(err.message || "We couldn't delete this category. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="preview-modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
      <div style={{ background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '500px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Manage Project Categories</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={20} color="#666" />
          </button>
        </div>
        
        <div style={{ padding: '20px', overflowY: 'auto' }}>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input
              type="text"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="New category name"
              className="admin-form-input"
              style={{ flex: 1 }}
            />
            <button type="submit" disabled={isSubmitting || !newCategory.trim()} className="admin-btn primary">
              <Plus size={16} /> Add
            </button>
          </form>

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}><Loader2 size={24} className="spin" color="#666" /></div>
          ) : categories.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>No categories yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categories.map(cat => (
                <div key={cat._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f9f9f9', borderRadius: '6px', border: '1px solid #eee' }}>
                  {editingId === cat._id ? (
                    <div style={{ display: 'flex', gap: '8px', flex: 1, marginRight: '16px' }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="admin-form-input"
                        autoFocus
                      />
                      <button onClick={() => handleUpdate(cat._id)} disabled={isSubmitting} className="admin-btn primary" style={{ padding: '6px 10px' }}>
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="admin-btn secondary" style={{ padding: '6px 10px' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontWeight: 500, fontSize: '14px', color: '#111' }}>{cat.name}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => { setEditingId(cat._id); setEditName(cat.name); }} className="admin-btn-icon" title="Rename">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(cat._id, cat.name)} className="admin-btn-icon danger" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
