import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Trash2,
  GripVertical,
  CheckCircle2,
  AlertTriangle,
  Upload,
  X,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult, DragStart } from '@hello-pangea/dnd';
import {
  getProject,
  createProject,
  updateProject,
  uploadHeroImage,
  uploadGalleryImages,
  replaceGalleryImage,
  deleteGalleryImage,
  reorderGalleryImages,
  IProject,
  getCategories,
} from '../services/projectApi';


import { ConfirmModal } from '../components/ConfirmModal';
import { MediaGridEditor } from '../components/MediaGridEditor';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { Loader } from '../components/Loader';
import { useAlert } from '../context/AlertContext';
import { getImageUrl } from '../utils/imageUrl';
import { useValidation } from '../hooks/useValidation';
import { InlineError } from '../components/InlineError';

interface PendingGalleryItem {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

export const ProjectEditor: React.FC = () => {
  const alert = useAlert();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const { errors, validate, clearError } = useValidation<string>();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<IProject>>({
    title: '',
    slug: '',
    subtitle: '',
    category: '',
    year: new Date().getFullYear().toString(),
    role: '',
    client: '',
    description: '',
    details: '',
    published: false,
    featured: false,
    images: [],
  });

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Cover Image State
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<{
    url: string;
    width?: number;
    height?: number;
    filename?: string;
  } | null>(null);

  // Pending Gallery Files State
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [pendingGallery, setPendingGallery] = useState<PendingGalleryItem[]>([]);

  // Active Drag State for Visual Compatibility Feedback
  

  // Helper to read natural image dimensions
  const readImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Could not load image "${file.name}". Please ensure it is a valid JPG, PNG, or WebP file.`));
      };
      img.src = objectUrl;
    });
  };

  useEffect(() => {
    const init = async () => {
      try {
        const catRes = await getCategories();
        if (catRes.success) setCategories(catRes.data);

        if (isEditing && id) {
          const projRes = await getProject(id);
          if (projRes.success && projRes.data) {
            setFormData(projRes.data);
            if (projRes.data.slug) {
              setSlugManuallyEdited(true);
            }

            if (projRes.data.heroImage && projRes.data.heroImage.url) {
              setHeroPreview({
                url: projRes.data.heroImage.url,
                width: projRes.data.heroImage.width,
                height: projRes.data.heroImage.height,
                filename: projRes.data.heroImage.filename || 'Project Cover Artwork',
              });
            }
          }
        }
      } catch (err: any) {
        const msg = err.message || 'Failed to load project details.';
        alert.error(msg, 'Load Failed');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEditing]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setFormData((prev) => ({ ...prev, title: newTitle }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '');
    setSlugManuallyEdited(val.length > 0);
    setFormData((prev) => ({
      ...prev,
      slug: val,
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  // Cover Image Selection
  const handleHeroFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const dims = await readImageDimensions(file);
    const objectUrl = URL.createObjectURL(file);
    setHeroFile(file);
    setHeroPreview({
      url: objectUrl,
      width: dims.width,
      height: dims.height,
      filename: file.name,
    });
    clearError('heroImage');

    alert.success(
      `Cover image verified (${dims.width} × ${dims.height} px). Click Save Project to apply.`,
      'Cover Ready'
    );
    e.target.value = '';
  };
  const removeHeroImage = async () => {
    const confirmed = await alert.confirm({
      title: 'Remove Cover Image?',
      message: 'Are you sure you want to remove the cover image for this project?',
      confirmLabel: 'Remove',
      isDanger: true,
    });
    if (!confirmed) return;

    if (heroPreview?.url && heroPreview.url.startsWith('blob:')) {
      URL.revokeObjectURL(heroPreview.url);
    }
    setHeroFile(null);
    setHeroPreview(null);
    setFormData((prev) => ({ ...prev, heroImage: undefined }));
    alert.info('Cover image selection removed.', 'Removed');
  };

  // Project Images Selection
  const handleGalleryFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPending: PendingGalleryItem[] = [];

    for (const file of files) {
      try {
        const { width, height } = await readImageDimensions(file);
        const previewUrl = URL.createObjectURL(file);
        
        newPending.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          file,
          previewUrl,
          width,
          height,
        });
      } catch (err: any) {
        alert.error(err.message || `Failed to process ${file.name}`, 'Processing Error');
      }
    }

    if (newPending.length > 0) {
      setPendingGallery((prev) => [...prev, ...newPending]);
      setGalleryFiles((prev) => [...prev, ...newPending.map((p) => p.file)]);
      alert.success(`${newPending.length} images staged. Click Save Project to upload.`, 'Images Staged');
    }

    e.target.value = '';
  };

  const removePendingGalleryItem = (id: string) => {
    setPendingGallery((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    setGalleryFiles((prev) => prev.filter((_, idx) => pendingGallery[idx]?.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = formData.title?.trim() || '';
    let trimmedSlug = formData.slug?.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '') || '';

    const isValid = validate({
      title: () => !trimmedTitle ? 'Please enter a project title before saving.' : null,
      slug: () => !trimmedSlug ? 'Please enter a URL slug for the project (e.g. "my-project").' : null,
      category: () => !formData.category ? 'Please select a project category from the dropdown.' : null,
      heroImage: () => !isEditing && !heroFile && !formData.heroImage?.url ? 'Cover Image is required. Please upload a cover image.' : null
    });

    if (!isValid) {
      alert.warning('Please fix the validation errors before saving.', 'Validation Failed');
      return;
    }

    try {
      setSaving(true);
      let projectId = id;

      // 1. Save Basic Data
      const projectPayload = {
        ...formData,
        title: trimmedTitle,
        slug: trimmedSlug,
        category:
          formData.category && typeof formData.category === 'object'
            ? (formData.category as any).name
            : formData.category || undefined,
      };

      if (isEditing && id) {
        await updateProject(id, projectPayload);
      } else {
        const res = await createProject(projectPayload);
        projectId = res.data._id;
      }

      // 2. Upload Hero Image if staged
      if (heroFile && projectId) {
        await uploadHeroImage(projectId, heroFile);
      }

      // 3. Upload Gallery Images if staged
      if (galleryFiles.length > 0 && projectId) {
        await uploadGalleryImages(projectId, galleryFiles);
      }

      // 4. Refetch project to keep state populated with saved URLs and dimensions
      if (projectId) {
        const refreshed = await getProject(projectId);
        if (refreshed?.data) {
          setFormData(refreshed.data);
          if (refreshed.data.heroImage?.url) {
            setHeroPreview({
              url: refreshed.data.heroImage.url,
              width: refreshed.data.heroImage.width,
              height: refreshed.data.heroImage.height,
              filename: refreshed.data.heroImage.filename,
            });
          }
        }
      }

      // Clear staged files since they are now in the database
      setHeroFile(null);
      setGalleryFiles([]);
      pendingGallery.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPendingGallery([]);

      // Seamlessly transition URL if created new project, staying on Edit Project without leaving
      if (!isEditing && projectId) {
        navigate(`/projects/edit/${projectId}`, { replace: true });
      }

      // Clear, confidence-building save notification (Sections 18-22)
      alert.success(
        isEditing
          ? '✓ Changes saved successfully. You can continue editing this project.'
          : '✓ Project saved successfully. Please review the images and content before publishing.',
        'Project Saved'
      );
    } catch (err: any) {
      const msg =
        err.message ||
        'Failed to save project. Please check your inputs and try again.';
      alert.error(msg, 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title={isEditing ? 'EDIT PROJECT' : 'NEW PROJECT'}
          actions={
            <Link to="/projects" className="admin-btn secondary" style={{ fontSize: '13px' }}>
              <ArrowLeft size={14} /> Back
            </Link>
          }
        />
        <Loader text="Loading project..." minHeight="300px" />
      </div>
    );
  }

  const currentImages = formData.images || [];

  return (
    <div>
      <PageHeader
        title={isEditing ? 'EDIT PROJECT' : 'NEW PROJECT'}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link to="/projects" className="admin-btn secondary">
              <ArrowLeft size={14} /> Back
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="admin-btn primary"
              style={{ fontSize: '13px', padding: '0.55rem 1.4rem' }}
            >
              <Save size={15} />
              {saving ? 'Saving...' : 'Save Project'}
            </button>
          </div>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* 1. PROJECT DETAILS */}
        <AdminSection title="PROJECT DETAILS">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.875rem',
            }}
          >
            <div className="admin-form-group" style={{ margin: 0 }}>
              <label className="admin-form-label" htmlFor="field-title">Title <span className="admin-required-asterisk">*</span></label>
              <input
                id="field-title"
                type="text"
                name="title"
                value={formData.title || ''}
                onChange={handleTitleChange}
                placeholder="Project title"
                className="admin-form-input"
                aria-invalid={!!errors['title']}
                required
              />
              <InlineError error={errors['title']} />
            </div>

            <div className="admin-form-group" style={{ margin: 0 }}>
              <label className="admin-form-label" htmlFor="field-slug">Slug <span className="admin-required-asterisk">*</span></label>
              <input
                id="field-slug"
                type="text"
                name="slug"
                value={formData.slug || ''}
                onChange={handleSlugChange}
                placeholder="e.g. brand-identity-2026"
                className="admin-form-input"
                aria-invalid={!!errors['slug']}
                required
              />
              <InlineError error={errors['slug']} />
            </div>

            <div className="admin-form-group" style={{ margin: 0 }}>
              <label className="admin-form-label" htmlFor="field-category">Category <span className="admin-required-asterisk">*</span></label>
              <select
                id="field-category"
                name="category"
                value={
                  formData.category && typeof formData.category === 'object'
                    ? (formData.category as any).name
                    : formData.category || ''
                }
                onChange={handleChange}
                className="admin-form-select"
                aria-invalid={!!errors['category']}
                required
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <InlineError error={errors['category']} />
            </div>

            <div className="admin-form-group" style={{ margin: 0 }}>
              <label className="admin-form-label">Year</label>
              <input
                type="text"
                name="year"
                value={formData.year || ''}
                onChange={handleChange}
                placeholder="2026"
                className="admin-form-input"
              />
            </div>

            <div className="admin-form-group" style={{ margin: 0 }}>
              <label className="admin-form-label">Client</label>
              <input
                type="text"
                name="client"
                value={formData.client || ''}
                onChange={handleChange}
                placeholder="Client or brand name"
                className="admin-form-input"
              />
            </div>

            <div className="admin-form-group" style={{ margin: 0 }}>
              <label className="admin-form-label">Role</label>
              <input
                type="text"
                name="role"
                value={formData.role || ''}
                onChange={handleChange}
                placeholder="e.g. Visual Identity, Art Direction"
                className="admin-form-input"
              />
            </div>
          </div>

          {/* Project Description with inline word count right on field */}
          <div className="admin-form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px',
              }}
            >
              <label className="admin-form-label" style={{ margin: 0 }}>
                Project Description
              </label>
              <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                {(formData.description || '').length} characters
              </span>
            </div>
            <textarea
              name="description"
              rows={3}
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="Brief summary of creative direction and deliverables..."
              className="admin-form-textarea"
            />
          </div>


        </AdminSection>

        {/* 2. COVER IMAGE */}
        <AdminSection title="COVER IMAGE">
          <InlineError error={errors['heroImage']} />
          {heroPreview ? (
            <div
              style={{
                border: '1px solid var(--admin-border)',
                borderRadius: '8px',
                padding: '0.875rem 1rem',
                background: '#FFFFFF',
                display: 'flex',
                gap: '1.25rem',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  width: '220px',
                  height: '124px',
                  background: 'var(--admin-surface-subtle)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  border: '1px solid var(--admin-border)',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <img
                  src={getImageUrl(heroPreview.url)}
                  alt="Cover Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: '6px',
                    right: '6px',
                    background: 'rgba(0,0,0,0.75)',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 5px',
                    borderRadius: '3px',
                  }}
                >
                  16:9
                </span>
              </div>

              <div style={{ flex: 1, minWidth: '220px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: '#E8F5E9',
                      color: '#2E7D32',
                    }}
                  >
                    <CheckCircle2 size={13} />
                    {heroPreview.width && heroPreview.height
                      ? `${heroPreview.width} × ${heroPreview.height} px`
                      : 'Cover Image'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                    Landscape (16:9)
                  </span>
                </div>

                <p
                  style={{
                    margin: '0 0 10px 0',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--admin-text-main)',
                    wordBreak: 'break-all',
                  }}
                >
                  {heroPreview.filename || 'Project Cover Artwork'}
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <label
                    className="admin-btn secondary"
                    style={{
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '0.4rem 0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Upload size={13} />
                    <span>Change Cover</span>
                    <input
                      type="file"
                      accept="image/jpeg, image/png, image/webp, image/avif"
                      onChange={handleHeroFileSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <label
              style={{
                border: '1px dashed var(--admin-border-strong)',
                borderRadius: '8px',
                padding: '1.75rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                background: 'var(--admin-surface-subtle)',
                transition: 'all 0.2s ease',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--admin-primary)';
                e.currentTarget.style.background = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--admin-border)';
                e.currentTarget.style.background = 'var(--admin-surface-subtle)';
              }}
            >
              <Upload size={22} color="var(--admin-text-main)" />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--admin-text-main)',
                }}
              >
                Click to upload cover image
              </span>
              <div style={{ display: 'inline-block', padding: '6px 12px', background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '20px', fontSize: '11.5px', color: 'var(--admin-text-main)', marginTop: '8px', textAlign: 'center', lineHeight: '1.5' }}>
                <strong style={{ color: '#E65100', marginRight: '6px' }}>REQUIRED:</strong>
                <span>Cover Image</span>
              </div>
              <input
                type="file"
                accept="image/jpeg, image/png, image/webp, image/avif"
                onChange={handleHeroFileSelect}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </AdminSection>

        <AdminSection title="PROJECT GALLERY">
          <p style={{ margin: '0 0 0.875rem 0', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
            Upload, drag, resize, and stretch your project images freely.
          </p>
          
          <label
            style={{
              border: '1px dashed var(--admin-border-strong)',
              borderRadius: '6px',
              padding: '14px 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.85rem',
              cursor: 'pointer',
              background: '#FFFFFF',
              marginBottom: '1rem',
              transition: 'all 0.2s ease',
            }}
          >
            <Upload size={18} color="var(--admin-text-main)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
              Select Images
            </span>
            <input
              type="file"
              multiple
              accept="image/jpeg, image/png, image/webp, image/avif"
              onChange={handleGalleryFilesSelect}
              style={{ display: 'none' }}
            />
          </label>

          {/* Pending uploaded files */}
          {pendingGallery.length > 0 && (
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
               {pendingGallery.map(p => (
                 <div key={p.id} style={{ position: 'relative', width: 100, height: 100 }}>
                   <img src={p.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   <button onClick={(e) => { e.preventDefault(); removePendingGalleryItem(p.id); }} style={{ position: 'absolute', top: 2, right: 2, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer' }}>X</button>
                 </div>
               ))}
               <p style={{ fontSize: '12px', color: 'gray', width: '100%' }}>Save project to apply these images to the grid.</p>
            </div>
          )}

          {formData.images && formData.images.length > 0 && (
            <MediaGridEditor
              items={formData.images.map(img => ({ id: img._id, url: getImageUrl(img.url), layouts: img.layouts }))}
              onChange={(updated) => {
                 const newImages = [...(formData.images || [])];
                 let hasChanges = false;
                 updated.forEach(u => {
                    const imgIndex = newImages.findIndex(i => i._id === u.id);
                    if (imgIndex !== -1 && JSON.stringify(newImages[imgIndex].layouts) !== JSON.stringify(u.layouts)) {
                      newImages[imgIndex] = { ...newImages[imgIndex], layouts: u.layouts };
                      hasChanges = true;
                    }
                 });
                 if (hasChanges) {
                    setFormData({ ...formData, images: newImages });
                    // Explicitly auto-save layouts on change
                    if (id) reorderGalleryImages(id, updated.map((u, idx) => ({ imageId: u.id, order: idx, layouts: u.layouts })));
                 }
              }}
              onDelete={async (imgId) => { const confirmed = await alert.confirm({ title: 'Remove Image?', message: 'Are you sure you want to remove this image from the project gallery? This cannot be undone.', confirmLabel: 'Remove', isDanger: true }); if (!confirmed || !id) return; try { const res = await deleteGalleryImage(id, imgId); if (res.data?.images) { setFormData(prev => ({ ...prev, images: res.data.images })); } alert.success('Image removed from gallery.', 'Removed'); } catch (err) { alert.error('Failed to remove image', 'Delete Failed'); } }}
              onReplace={() => { /* Replacement via upload is preferred */ }}
            />
          )}
        </AdminSection>
      </div>
    </div>
  );
};
