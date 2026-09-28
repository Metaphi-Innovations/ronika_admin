import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Trash2,
  GripVertical,
  CheckCircle2,
  Upload,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  getProject,
  createProject,
  updateProject,
  uploadHeroImage,
  uploadGalleryImages,
  deleteGalleryImage,
  reorderGalleryImages,
  IProject,
} from '../services/projectApi';
import { getCategories } from '../services/categoryApi';
import { calculateRowPattern } from '../utils/imageLayout';
import { ConfirmModal } from '../components/ConfirmModal';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { useAlert } from '../context/AlertContext';
import { countReadableWords } from '../utils/richText';

const REQUIRED_RATIOS = {
  1: { name: '16:9', val: 1.77, minW: 1600, recW: 1920 },
  2: { name: '4:3', val: 1.33, minW: 1200, recW: 1600 },
  3: { name: '1:1', val: 1.0, minW: 800, recW: 1200 },
};

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

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [deleteImageTarget, setDeleteImageTarget] = useState<{ id: string } | null>(null);
  const [deletingImage, setDeletingImage] = useState(false);

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

  // Dimension validation helper
  const validateImageDimensions = (
    file: File,
    minWidth: number,
    minHeight: number,
    expectedType: 'landscape' | 'portrait' | 'any'
  ): Promise<{ valid: boolean; error?: string; width?: number; height?: number }> => {
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const { width, height } = img;

        if (width < minWidth || height < minHeight) {
          return resolve({
            valid: false,
            width,
            height,
            error: `Image dimensions (${width} × ${height} px) do not meet the minimum requirement of ${minWidth} × ${minHeight} px.`,
          });
        }

        if (expectedType === 'landscape') {
          if (width <= height) {
            return resolve({
              valid: false,
              width,
              height,
              error: `Cover Image must be horizontal landscape (16:9). Selected file is vertical or square (${width} × ${height} px).`,
            });
          }
        } else if (expectedType === 'portrait') {
          if (height <= width) {
            return resolve({
              valid: false,
              width,
              height,
              error: `Image must be vertical portrait (3:4). Selected file is horizontal or square (${width} × ${height} px).`,
            });
          }
        }

        return resolve({ valid: true, width, height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          valid: false,
          error: 'Could not process image file. Please choose a valid JPG, PNG, or WebP image.',
        });
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
            setSlugManuallyEdited(true);

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
        alert.error(err.message || 'Failed to load project details.', 'Error');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEditing]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setFormData((prev) => {
      const updated: Partial<IProject> = { ...prev, title: newTitle };
      if (!slugManuallyEdited && !isEditing) {
        updated.slug = newTitle
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

    // Strict validation: Width: Min 1600 px (Optimal 1920-2560 px), Height: Min 900 px (Optimal 1080-1440 px)
    const validation = await validateImageDimensions(file, 1600, 900, 'landscape');
    if (!validation.valid) {
      alert.error(
        validation.error || 'Invalid cover image dimensions. Must be horizontal 16:9 (Min: 1600 × 900 px).',
        'Dimension Error'
      );
      e.target.value = '';
      return;
    }

    if (heroPreview?.url && heroPreview.url.startsWith('blob:')) {
      URL.revokeObjectURL(heroPreview.url);
    }

    const objectUrl = URL.createObjectURL(file);
    setHeroFile(file);
    setHeroPreview({
      url: objectUrl,
      width: validation.width,
      height: validation.height,
      filename: file.name,
    });

    alert.success(
      `Cover image verified (${validation.width} × ${validation.height} px). Click Save Project to apply.`,
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

  // Gallery Images Selection
  const handleGalleryFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPending: PendingGalleryItem[] = [];
    let rejectedCount = 0;

    for (const file of files) {
      const dim = await validateImageDimensions(file, 800, 600, 'any');
      if (!dim.valid) {
        alert.error(`"${file.name}": ${dim.error}`, 'Image Rejected');
        rejectedCount++;
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newPending.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        file,
        previewUrl,
        width: dim.width || 0,
        height: dim.height || 0,
      });
    }

    if (newPending.length > 0) {
      setPendingGallery((prev) => [...prev, ...newPending]);
      setGalleryFiles((prev) => [...prev, ...newPending.map((p) => p.file)]);
      alert.success(
        `${newPending.length} gallery image(s) verified. Click Save Project to upload.`,
        'Images Staged'
      );
    }
    e.target.value = '';
  };

  const removePendingGalleryItem = (itemId: string) => {
    setPendingGallery((prev) => {
      const item = prev.find((p) => p.id === itemId);
      if (item) URL.revokeObjectURL(item.previewUrl);
      const filtered = prev.filter((p) => p.id !== itemId);
      setGalleryFiles(filtered.map((p) => p.file));
      return filtered;
    });
    alert.info('Gallery upload staged item removed.', 'Removed');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      alert.warning('Please enter a project title.', 'Validation Error');
      return;
    }
    if (!formData.slug?.trim()) {
      alert.warning('Please enter a URL slug for the project.', 'Validation Error');
      return;
    }
    if (!formData.category) {
      alert.warning('Please select a project category.', 'Validation Error');
      return;
    }

    // Strict validation: Cover image must exist
    if (!isEditing && !heroFile && !formData.heroImage?.url) {
      alert.warning(
        'Cover Image is required. Please upload a 16:9 horizontal image (Min: 1600 × 900 px).',
        'Cover Image Required'
      );
      return;
    }

    try {
      setSaving(true);
      let projectId = id;

      // 1. Save Basic Data
      const projectPayload = {
        ...formData,
        category:
          formData.category && typeof formData.category === 'object'
            ? (formData.category as any)._id
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

      alert.success(
        isEditing
          ? `Project "${formData.title}" updated successfully!`
          : `Project "${formData.title}" created successfully!`,
        'Saved'
      );
      navigate('/projects');
    } catch (err: any) {
      alert.error(err.message || 'Failed to save project', 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !formData.images || !id) return;

    const items = Array.from(formData.images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFormData((prev) => ({ ...prev, images: items }));

    const orderUpdates = items.map((img, index) => ({ imageId: img._id, order: index }));
    try {
      await reorderGalleryImages(id, orderUpdates);
      alert.info('Gallery images reordered successfully.', 'Reordered');
    } catch (err: any) {
      alert.error('Failed to save image order on server.', 'Order Error');
    }
  };

  const confirmDeleteImage = async () => {
    if (!id || !deleteImageTarget) return;
    try {
      setDeletingImage(true);
      await deleteGalleryImage(id, deleteImageTarget.id);
      setFormData((prev) => ({
        ...prev,
        images: prev.images?.filter((img) => img._id !== deleteImageTarget.id),
      }));
      setDeleteImageTarget(null);
      alert.success('Gallery image removed successfully.', 'Removed');
    } catch (err: any) {
      alert.error(err.message || 'Failed to remove gallery image', 'Error');
    } finally {
      setDeletingImage(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
        Loading project editor...
      </div>
    );
  }

  const currentImages = formData.images || [];
  const pattern = calculateRowPattern(currentImages.length + galleryFiles.length);

  let imgIndex = 0;
  const imageAssignments = pattern.flatMap((rowSize) => {
    const slots = [];
    for (let i = 0; i < rowSize; i++) {
      slots.push({ index: imgIndex++, rowSize });
    }
    return slots;
  });

  const descriptionWordCount = countReadableWords(formData.description || '');

  return (
    <div>
      <PageHeader
        title={isEditing ? 'EDIT PROJECT' : 'NEW PROJECT'}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link to="/projects" className="admin-btn secondary" style={{ fontSize: '13px' }}>
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
        {categories.length === 0 && !loading && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: '#FFF3E0',
              border: '1px solid #FFE0B2',
              borderRadius: '6px',
              fontSize: '12.5px',
              color: '#E65100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>No project categories exist yet. Create a category to classify this project.</span>
            <Link
              to="/categories"
              style={{ fontWeight: 600, color: '#E65100', textDecoration: 'underline' }}
            >
              Manage Categories &rarr;
            </Link>
          </div>
        )}

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
              <label className="admin-form-label">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title || ''}
                onChange={handleTitleChange}
                placeholder="Project title"
                className="admin-form-input"
                required
              />
            </div>

            <div className="admin-form-group" style={{ margin: 0 }}>
              <label className="admin-form-label">Slug *</label>
              <input
                type="text"
                name="slug"
                value={formData.slug || ''}
                onChange={handleSlugChange}
                placeholder="project-slug"
                className="admin-form-input"
                required
              />
            </div>

            <div className="admin-form-group" style={{ margin: 0 }}>
              <label className="admin-form-label">Category *</label>
              <select
                name="category"
                value={
                  formData.category && typeof formData.category === 'object'
                    ? (formData.category as any)._id
                    : formData.category || ''
                }
                onChange={handleChange}
                className="admin-form-select"
                required
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {(!formData.category || (typeof formData.category === 'object' && !(formData.category as any)?._id)) && (
                <div style={{ fontSize: '11px', color: '#D84315', marginTop: '4px', fontWeight: 500 }}>
                  ⚠ Unassigned. Please select a category.
                </div>
              )}
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
                {descriptionWordCount} words
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

          {/* Toggles */}
          <div
            style={{
              display: 'flex',
              gap: '2rem',
              marginTop: '0.875rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--admin-border-color)',
            }}
          >
            <label
              className="admin-switch-row"
              style={{
                margin: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <input
                type="checkbox"
                name="published"
                checked={formData.published || false}
                onChange={handleChange}
                style={{ width: '16px', height: '16px', accentColor: '#111' }}
              />
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--admin-text-main)' }}>
                Published
              </span>
            </label>

            <label
              className="admin-switch-row"
              style={{
                margin: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured || false}
                onChange={handleChange}
                style={{ width: '16px', height: '16px', accentColor: '#111' }}
              />
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--admin-text-main)' }}>
                Featured on Homepage
              </span>
            </label>
          </div>
        </AdminSection>

        {/* 2. COVER IMAGE */}
        <AdminSection title="COVER IMAGE">
          {heroPreview ? (
            <div
              style={{
                border: '1px solid var(--admin-border-color)',
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
                  background: '#FAFAF8',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  border: '1px solid var(--admin-border-color)',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <img
                  src={heroPreview.url}
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
                  <button
                    type="button"
                    onClick={removeHeroImage}
                    className="admin-btn-icon danger"
                    title="Remove Cover Image"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <label
              style={{
                border: '2px dashed var(--admin-border-color)',
                borderRadius: '8px',
                padding: '1.75rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                background: '#FAFAF8',
                transition: 'all 0.2s ease',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--admin-primary)';
                e.currentTarget.style.background = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--admin-border-color)';
                e.currentTarget.style.background = '#FAFAF8';
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
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '2px',
                  padding: '3px 9px',
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid var(--admin-border-color)',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#444444',
                }}
              >
                <span style={{ color: '#E65100', fontWeight: 700 }}>REQUIRED:</span>
                <span>Landscape 16:9 • Min: 1600 × 900 px (Optimal: 1920 × 1080 px)</span>
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

        {/* 3. PROJECT GALLERY */}
        <AdminSection title="PROJECT GALLERY">
          {/* Dimension Guidelines Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '0.625rem',
              marginBottom: '0.875rem',
              padding: '0.75rem',
              background: '#F9F9F7',
              borderRadius: '6px',
              border: '1px solid var(--admin-border-color)',
            }}
          >
            <div style={{ fontSize: '11.5px', lineHeight: 1.35 }}>
              <div style={{ fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '1px' }}>
                Full-Width Row (16:9)
              </div>
              <div style={{ color: 'var(--admin-text-muted)' }}>
                Min: <strong style={{ color: '#111' }}>1600 × 900 px</strong> • Optimal: 1920 × 1080 px
              </div>
            </div>
            <div style={{ fontSize: '11.5px', lineHeight: 1.35 }}>
              <div style={{ fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '1px' }}>
                Two-Column Row (4:3)
              </div>
              <div style={{ color: 'var(--admin-text-muted)' }}>
                Min: <strong style={{ color: '#111' }}>1200 × 900 px</strong> • Optimal: 1600 × 1200 px
              </div>
            </div>
            <div style={{ fontSize: '11.5px', lineHeight: 1.35 }}>
              <div style={{ fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '1px' }}>
                Three-Column Row (1:1)
              </div>
              <div style={{ color: 'var(--admin-text-muted)' }}>
                Min: <strong style={{ color: '#111' }}>800 × 800 px</strong> • Optimal: 1200 × 1200 px
              </div>
            </div>
          </div>

          {/* Gallery Upload Dropcard */}
          <label
            style={{
              border: '2px dashed var(--admin-border-color)',
              borderRadius: '6px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              background: '#FFFFFF',
              marginBottom: '0.875rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--admin-primary)';
              e.currentTarget.style.background = '#FAFAF8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--admin-border-color)';
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <Upload size={17} color="var(--admin-text-main)" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
                + Select Gallery Artworks
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--admin-text-muted)',
                  background: '#F0F0EE',
                  padding: '2px 7px',
                  borderRadius: '4px',
                }}
              >
                Multi-file • Min width 1200 px recommended
              </span>
            </div>
            <input
              type="file"
              multiple
              accept="image/jpeg, image/png, image/webp, image/avif"
              onChange={handleGalleryFilesSelect}
              style={{ display: 'none' }}
            />
          </label>

          {/* Pending Gallery Uploads Staged List */}
          {pendingGallery.length > 0 && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.875rem',
                background: '#FAFAF8',
                border: '1px solid var(--admin-border-color)',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.625rem',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
                  Pending Uploads ({pendingGallery.length})
                </div>
                <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                  Uploads upon saving project
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '0.625rem',
                }}
              >
                {pendingGallery.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--admin-border-color)',
                      borderRadius: '5px',
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '90px',
                        background: '#F0F0EE',
                        position: 'relative',
                      }}
                    >
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => removePendingGalleryItem(item.id)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: 'rgba(0,0,0,0.65)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                        title="Remove from queue"
                      >
                        <X size={11} />
                      </button>
                    </div>
                    <div style={{ padding: '5px 7px' }}>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          color: 'var(--admin-text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.file.name}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'var(--admin-text-muted)',
                          marginTop: '1px',
                        }}
                      >
                        {item.width} × {item.height} px
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Gallery Images Reorder List */}
          {currentImages.length === 0 && pendingGallery.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <ImageIcon
                size={28}
                color="var(--admin-border-color)"
                style={{ marginBottom: '0.375rem' }}
              />
              <p
                style={{
                  color: 'var(--admin-text-muted)',
                  fontSize: '12.5px',
                  margin: 0,
                }}
              >
                No gallery artwork uploaded yet.
              </p>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="gallery">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                  >
                    {currentImages.map((img, index) => {
                      const rowSize = imageAssignments[index]?.rowSize || 1;
                      const req = REQUIRED_RATIOS[rowSize as keyof typeof REQUIRED_RATIOS];

                      const isRatioValid = Math.abs(img.aspectRatio - req.val) < 0.15;
                      const isSizeValid = img.width >= req.minW;
                      const isValid = isRatioValid && isSizeValid;

                      return (
                        <Draggable key={img._id} draggableId={img._id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.875rem',
                                padding: '0.5rem 0.75rem',
                                background: snapshot.isDragging ? '#FFFFFF' : '#FAFAF8',
                                border: `1px solid ${
                                  snapshot.isDragging ? '#111111' : 'var(--admin-border-color)'
                                }`,
                                borderRadius: '6px',
                                boxShadow: snapshot.isDragging
                                  ? '0 4px 12px rgba(0,0,0,0.06)'
                                  : 'none',
                                transition: 'background 0.2s, box-shadow 0.2s',
                              }}
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="admin-drag-handle"
                                title="Drag to reorder"
                              >
                                <GripVertical size={15} />
                              </div>

                              <div
                                style={{
                                  width: '64px',
                                  height: '42px',
                                  background: '#FFFFFF',
                                  borderRadius: '4px',
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                  border: '1px solid var(--admin-border-color)',
                                }}
                              >
                                <img
                                  src={img.url}
                                  alt={img.filename}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>

                              <div
                                style={{
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.75rem',
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      fontSize: '12.5px',
                                      color: 'var(--admin-text-main)',
                                    }}
                                  >
                                    Image {String(index + 1).padStart(2, '0')}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--admin-text-muted)',
                                      marginTop: '1px',
                                    }}
                                  >
                                    {rowSize === 1
                                      ? 'Full-width row (16:9)'
                                      : rowSize === 2
                                      ? 'Two-column row (4:3)'
                                      : 'Three-column row (1:1)'}{' '}
                                    · {img.width} × {img.height} px
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                  {!isValid && (
                                    <span
                                      style={{
                                        fontSize: '10.5px',
                                        color: '#E65100',
                                        background: '#FFF3E0',
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        fontWeight: 500,
                                      }}
                                    >
                                      Ratio notice
                                    </span>
                                  )}
                                  <button
                                    onClick={() => setDeleteImageTarget({ id: img._id })}
                                    className="admin-btn-icon danger"
                                    title="Delete Image"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </AdminSection>
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteImageTarget)}
        title="Delete Gallery Artwork?"
        message="Are you sure you want to permanently remove this image from the project gallery? This action cannot be undone."
        confirmLabel="Delete Artwork"
        isLoading={deletingImage}
        onConfirm={confirmDeleteImage}
        onClose={() => setDeleteImageTarget(null)}
      />
    </div>
  );
};
