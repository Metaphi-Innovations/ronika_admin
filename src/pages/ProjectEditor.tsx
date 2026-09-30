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
} from '../services/projectApi';
import { getCategories } from '../services/categoryApi';
import {
  calculateRowPattern,
  getProjectImageRatio,
  getProjectImageSlot,
  validateSlotDimensions,
  getProjectImageType,
  canMoveProjectImage,
  reorderCompatibleImages,
  ProjectImageSlotRule,
  ProjectSlotType,
} from '../utils/imageLayout';
import { ConfirmModal } from '../components/ConfirmModal';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { useAlert } from '../context/AlertContext';
import { countReadableWords } from '../utils/richText';
import { getImageUrl } from '../utils/imageUrl';

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
  const [draggedImage, setDraggedImage] = useState<{ id: string; type: ProjectSlotType } | null>(null);

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

  // Project Images Selection — STRICT Positional Dimension Validation
  const handleGalleryFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentCount = (formData.images || []).length;
    let stagedCount = pendingGallery.length;
    const newPending: PendingGalleryItem[] = [];

    for (const file of files) {
      const targetPos = currentCount + stagedCount + 1;
      const slot = getProjectImageSlot(targetPos);

      try {
        const { width, height } = await readImageDimensions(file);
        const validation = validateSlotDimensions(width, height, slot);

        if (!validation.valid) {
          alert.error(
            `✕ Image not accepted\n\nThis position requires an image that is exactly:\n${slot.expectedText}\n\nYour image ("${file.name}"):\n${width} × ${height} px\n\nPlease upload the correct dimensions.`,
            `Position ${targetPos} Dimension Rejection`
          );
          // Do not upload or stage invalid image
          continue;
        }

        const previewUrl = URL.createObjectURL(file);
        newPending.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          file,
          previewUrl,
          width,
          height,
        });
        stagedCount++;
      } catch (err: any) {
        alert.error(`Failed to read dimensions for "${file.name}": ${err.message}`, 'File Read Error');
      }
    }

    if (newPending.length > 0) {
      setPendingGallery((prev) => [...prev, ...newPending]);
      setGalleryFiles((prev) => [...prev, ...newPending.map((p) => p.file)]);
      alert.success(
        `${newPending.length} project image(s) verified against exact position requirements and staged. Click Save Project to upload.`,
        'Position Verified'
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

    // Final validation of all existing project images before save
    if (formData.images && formData.images.length > 0) {
      for (let idx = 0; idx < formData.images.length; idx++) {
        const img = formData.images[idx];
        const pos = idx + 1;
        const slot = getProjectImageSlot(pos);
        const validation = validateSlotDimensions(img.width || 0, img.height || 0, slot);
        if (!validation.valid) {
          alert.error(
            `Project images cannot be saved.\n\nPosition ${pos} requires:\n${slot.expectedText}\n\nCurrent image:\n${img.width} × ${img.height} px\n\nPlease reorder or replace the image.`,
            'Image Dimension Error'
          );
          return;
        }
      }
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
      alert.error(err.message || 'Failed to save project', 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const onDragStart = (start: DragStart) => {
    if (!formData.images) return;
    const img = formData.images.find((i) => i._id === start.draggableId);
    if (img) {
      const detectedType = getProjectImageType(img);
      const slotType = detectedType !== 'unknown' ? detectedType : getProjectImageSlot(start.source.index + 1).type;
      setDraggedImage({ id: img._id, type: slotType });
    }
  };

  const onDragEnd = async (result: DropResult) => {
    setDraggedImage(null);
    if (!result.destination || !formData.images || !id) return;
    if (result.destination.index === result.source.index) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    const sourceImg = formData.images[sourceIndex];

    const sourceSlot = getProjectImageSlot(sourceIndex + 1);
    const targetSlot = getProjectImageSlot(destIndex + 1);
    const detectedType = getProjectImageType(sourceImg);
    const sourceType = detectedType !== 'unknown' ? detectedType : sourceSlot.type;

    // STRICT COMPATIBILITY VALIDATION: Cross-type drops are strictly prohibited
    if (sourceType !== targetSlot.type) {
      alert.error(
        `Cannot move this image to Position ${destIndex + 1}.\n\nPosition ${destIndex + 1} requires a ${targetSlot.type} slot (${targetSlot.expectedText}), but the dragged image is ${sourceType}.\n\nImages can only be reordered into positions requiring the same ratio.`,
        'Incompatible Drop Blocked'
      );
      return; // ATOMIC: LEAVE ORDER COMPLETELY UNCHANGED
    }

    // Perform reorder strictly within the compatibility group
    const newImages = reorderCompatibleImages(formData.images, sourceIndex, destIndex);

    // Validate that every image in the entire resulting array strictly satisfies its target position
    for (let idx = 0; idx < newImages.length; idx++) {
      const img = newImages[idx];
      const targetPosition = idx + 1;
      const slot = getProjectImageSlot(targetPosition);
      const width = img.width || 0;
      const height = img.height || 0;

      const validation = validateSlotDimensions(width, height, slot);
      if (!validation.valid) {
        alert.error(
          `Cannot save this order.\n\nImage occupying Position ${targetPosition} requires:\n${slot.description}\n\nCurrent image: ${width} × ${height} px.\n\nPlease choose a valid order.`,
          'Reorder Rejected'
        );
        return; // REJECT REORDER: DO NOT UPDATE STATE OR BACKEND
      }
    }

    setFormData((prev) => ({ ...prev, images: newImages }));

    const orderUpdates = newImages.map((img, index) => ({ imageId: img._id, order: index }));
    try {
      await reorderGalleryImages(id, orderUpdates);
      alert.success('Gallery images reordered successfully within compatible positions.', 'Reordered');
    } catch (err: any) {
      // Rollback to server state on error
      const refreshed = await getProject(id);
      if (refreshed?.data?.images) {
        setFormData((prev) => ({ ...prev, images: refreshed.data.images }));
      }
      alert.error(err.response?.data?.message || err.message || 'Failed to save image order on server.', 'Order Error');
    }
  };

  // Keyboard / Touch Accessible Reorder within Compatibility Group
  const handleMoveWithinGroup = async (index: number, direction: 'prev' | 'next') => {
    if (!formData.images || !id) return;
    const currentSlot = getProjectImageSlot(index + 1);
    const groupType = currentSlot.type;

    const compatibleIndices: number[] = [];
    formData.images.forEach((img, idx) => {
      if (getProjectImageSlot(idx + 1).type === groupType) {
        compatibleIndices.push(idx);
      }
    });

    const currentGroupIdx = compatibleIndices.indexOf(index);
    if (currentGroupIdx === -1) return;

    const targetGroupIdx = direction === 'prev' ? currentGroupIdx - 1 : currentGroupIdx + 1;
    if (targetGroupIdx < 0 || targetGroupIdx >= compatibleIndices.length) return;

    const destIndex = compatibleIndices[targetGroupIdx];
    const newImages = reorderCompatibleImages(formData.images, index, destIndex);

    setFormData((prev) => ({ ...prev, images: newImages }));
    const orderUpdates = newImages.map((img, idx) => ({ imageId: img._id, order: idx }));

    try {
      await reorderGalleryImages(id, orderUpdates);
      alert.success(`Moved image to Position ${destIndex + 1}.`, 'Reordered');
    } catch (err: any) {
      const refreshed = await getProject(id);
      if (refreshed?.data?.images) {
        setFormData((prev) => ({ ...prev, images: refreshed.data.images }));
      }
      alert.error(err.response?.data?.message || err.message || 'Failed to save image order.', 'Order Error');
    }
  };

  // Handle in-place gallery image replacement to preserve fixed positional ratios
  const handleReplaceGalleryImage = async (
    imageId: string,
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Reset input so user can pick the same file again if desired
    if (!file) return;

    const position = index + 1;
    const slot = getProjectImageSlot(position);

    try {
      // 1. Client-side dimension and ratio verification against this exact slot
      const { width, height } = await readImageDimensions(file);
      const validation = validateSlotDimensions(width, height, slot);

      if (!validation.valid) {
        alert.error(
          `✕ Replacement image rejected\n\nPosition ${position} requires an image that is:\n${slot.expectedText}\n\nYour selected image ("${file.name}") is:\n${width} × ${height} px.\n\nPlease upload an image with the exact required ratio.`,
          `Position ${position} Dimension Mismatch`
        );
        return;
      }

      // 2. Upload replacement image to server if project already exists
      if (id) {
        setReplacingImageId(imageId);
        const res = await replaceGalleryImage(id, imageId, file);
        if (res.data?.images) {
          setFormData((prev) => ({ ...prev, images: res.data.images }));
        }
        alert.success(
          `✓ Position ${position} image replaced successfully with "${file.name}" (${width} × ${height} px).`,
          'Image Replaced'
        );
      } else {
        // If creating a brand new unsaved project
        const previewUrl = URL.createObjectURL(file);
        setFormData((prev) => {
          const updated = [...(prev.images || [])];
          if (updated[index]) {
            updated[index] = {
              ...updated[index],
              url: previewUrl,
              filename: file.name,
              originalName: file.name,
              width,
              height,
              aspectRatio: height > 0 ? parseFloat((width / height).toFixed(4)) : 0,
            };
          }
          return { ...prev, images: updated };
        });
        alert.success(
          `✓ Position ${position} image replaced. Click Save Project to upload.`,
          'Image Staged'
        );
      }
    } catch (err: any) {
      alert.error(
        err.response?.data?.message || err.message || 'Failed to replace image',
        'Replacement Error'
      );
    } finally {
      setReplacingImageId(null);
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
          <p style={{ margin: '0 0 0.875rem 0', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
            Images strictly follow a fixed positional dimension rule. Position 1: <strong>1600 × 900 px</strong> • Positions 2 &amp; 3: <strong>400 × 300 px</strong> • Position 4: <strong>1600 × 900 px</strong> • Positions 5, 6, 7: <strong>Square (any size)</strong> • Position 8+ repeats [1600 × 900, 400 × 300, 400 × 300] indefinitely.
          </p>

          {/* Dynamic Next Slot Indicator */}
          {(() => {
            const nextPos = (formData.images?.length || 0) + pendingGallery.length + 1;
            const nextSlot = getProjectImageSlot(nextPos);
            return (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  marginBottom: '1rem',
                  padding: '0.75rem 1rem',
                  background: '#F9F9F7',
                  borderRadius: '6px',
                  border: '1px solid var(--admin-border-color)',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--admin-text-main)' }}>Positional Requirement: </span>
                  <span style={{ color: 'var(--admin-text-muted)' }}>
                    {nextSlot.type === '1:1'
                      ? 'Upload a square image. Any square size is accepted (width === height).'
                      : `Upload an image exactly ${nextSlot.expectedText}.`}
                  </span>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 9px',
                    borderRadius: '4px',
                    background: '#E8F5E9',
                    color: '#2E7D32',
                    fontWeight: 600,
                    fontSize: '11.5px',
                  }}
                >
                  <span>Target Position {nextPos} ({nextSlot.type}): {nextSlot.expectedText}</span>
                </div>
              </div>
            );
          })()}

          {/* Gallery Upload Dropcard */}
          {(() => {
            const nextPos = (formData.images?.length || 0) + pendingGallery.length + 1;
            const nextSlot = getProjectImageSlot(nextPos);
            return (
              <label
                style={{
                  border: '2px dashed var(--admin-border-color)',
                  borderRadius: '6px',
                  padding: '1.1rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.85rem',
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
                <Upload size={18} color="var(--admin-text-main)" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
                    + Select Image for Position {nextPos}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#1B5E20',
                      background: '#E8F5E9',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    Required: {nextSlot.expectedText}
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
            );
          })()}

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
            <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
              <Droppable droppableId="gallery">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}
                  >
                    {currentImages.map((img, index) => {
                      const position = index + 1;
                      const slot = getProjectImageSlot(position);
                      const validation = validateSlotDimensions(img.width || 0, img.height || 0, slot);
                      const isMatch = validation.valid;

                      // Check compatibility status during active drag
                      const isCompatibleTarget = draggedImage ? slot.type === draggedImage.type : true;

                      // Compatibility group helper for Move Up / Move Down buttons
                      const compatibleIndices: number[] = [];
                      currentImages.forEach((cImg, cIdx) => {
                        if (getProjectImageSlot(cIdx + 1).type === slot.type) {
                          compatibleIndices.push(cIdx);
                        }
                      });
                      const groupPositionIdx = compatibleIndices.indexOf(index);
                      const canMovePrev = groupPositionIdx > 0;
                      const canMoveNext = groupPositionIdx !== -1 && groupPositionIdx < compatibleIndices.length - 1;

                      return (
                        <Draggable key={img._id} draggableId={img._id} index={index}>
                          {(provided, snapshot) => {
                            // Compute dynamic card style
                            let cardBorder = '1px solid var(--admin-border-color)';
                            let cardBg = snapshot.isDragging ? '#FFFFFF' : '#FAFAF8';
                            let cardShadow = snapshot.isDragging
                              ? '0 12px 28px rgba(0,0,0,0.14)'
                              : 'none';
                            let cardTransform = snapshot.isDragging ? 'scale(1.02)' : 'none';
                            let cardOpacity = 1;

                            if (draggedImage) {
                              if (snapshot.isDragging) {
                                cardBorder = '2px solid #111111';
                                cardBg = '#FFFFFF';
                              } else if (isCompatibleTarget) {
                                cardBorder = '2px dashed #2E7D32';
                                cardBg = '#F1F8E9';
                              } else {
                                cardBorder = '1px dashed #E0E0E0';
                                cardBg = '#FAFAF8';
                                cardOpacity = 0.45;
                              }
                            } else if (!isMatch) {
                              cardBorder = '1px solid #EF5350';
                            }

                            return (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="project-gallery-item-card"
                                style={{
                                  ...provided.draggableProps.style,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.875rem',
                                  padding: '0.75rem 0.875rem',
                                  background: cardBg,
                                  border: cardBorder,
                                  borderRadius: '6px',
                                  boxShadow: cardShadow,
                                  opacity: cardOpacity,
                                  transform: cardTransform,
                                  transition: 'background 0.2s, border 0.2s, box-shadow 0.2s, opacity 0.2s',
                                  position: 'relative',
                                }}
                              >
                                {/* Dedicated Drag Handle - Grab to reorder */}
                                <div
                                  {...provided.dragHandleProps}
                                  className="admin-drag-handle"
                                  title="Grab drag handle to reorder (moves within same ratio positions)"
                                  style={{
                                    cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '6px 4px',
                                    borderRadius: '4px',
                                    color: snapshot.isDragging ? '#111111' : 'var(--admin-text-muted)',
                                    background: snapshot.isDragging ? '#EEEEEE' : 'transparent',
                                  }}
                                >
                                  <GripVertical size={18} />
                                </div>

                                {/* Image Preview Thumbnail */}
                                <div
                                  style={{
                                    width: '74px',
                                    height: '48px',
                                    background: '#FFFFFF',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    border: '1px solid var(--admin-border-color)',
                                    position: 'relative',
                                  }}
                                >
                                  <img
                                    src={getImageUrl(img.url)}
                                    alt={img.filename}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                  <span
                                    style={{
                                      position: 'absolute',
                                      bottom: '2px',
                                      right: '2px',
                                      background: 'rgba(0,0,0,0.7)',
                                      color: '#FFFFFF',
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      padding: '1px 3px',
                                      borderRadius: '2px',
                                    }}
                                  >
                                    {slot.type}
                                  </span>
                                </div>

                                {/* Content & Position Details */}
                                <div
                                  className="project-gallery-item-content"
                                  style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.75rem',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{
                                        fontWeight: 600,
                                        fontSize: '12.5px',
                                        color: 'var(--admin-text-main)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        flexWrap: 'wrap',
                                      }}
                                    >
                                      <span>POSITION {String(position).padStart(2, '0')}</span>
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          background: '#EAEAE6',
                                          color: '#333333',
                                        }}
                                      >
                                        {slot.type}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          fontWeight: 500,
                                          color: 'var(--admin-text-muted)',
                                        }}
                                      >
                                        Required: {slot.expectedText}
                                      </span>

                                      {/* Drag Target Status Indicator */}
                                      {draggedImage && !snapshot.isDragging && (
                                        isCompatibleTarget ? (
                                          <span
                                            style={{
                                              fontSize: '10.5px',
                                              fontWeight: 700,
                                              padding: '1px 7px',
                                              borderRadius: '3px',
                                              background: '#2E7D32',
                                              color: '#FFFFFF',
                                              letterSpacing: '0.3px',
                                            }}
                                          >
                                            DROP HERE ({slot.type})
                                          </span>
                                        ) : (
                                          <span
                                            style={{
                                              fontSize: '10.5px',
                                              fontWeight: 600,
                                              padding: '1px 7px',
                                              borderRadius: '3px',
                                              background: '#ECEFF1',
                                              color: '#78909C',
                                            }}
                                          >
                                            NOT AVAILABLE ({slot.type})
                                          </span>
                                        )
                                      )}
                                    </div>

                                    <div
                                      style={{
                                        fontSize: '11px',
                                        marginTop: '3px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        flexWrap: 'wrap',
                                      }}
                                    >
                                      {isMatch ? (
                                        <span
                                          style={{
                                            color: '#2E7D32',
                                            fontWeight: 600,
                                            background: '#E8F5E9',
                                            padding: '1px 6px',
                                            borderRadius: '3px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                          }}
                                        >
                                          ✓ {img.width} × {img.height} px
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            color: '#C62828',
                                            fontWeight: 600,
                                            background: '#FFEBEE',
                                            padding: '1px 6px',
                                            borderRadius: '3px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                          }}
                                        >
                                          ✕ {img.width} × {img.height} px (Invalid for Position {position})
                                        </span>
                                      )}
                                      <span style={{ color: 'var(--admin-text-muted)', fontSize: '11px' }}>
                                        {img.filename}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Action Controls: Accessible Move Up/Down + Replace */}
                                  <div
                                    className="project-gallery-item-actions"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                  >
                                    {/* Keyboard / Touch Accessible Reorder Buttons (strictly obeys compatibility) */}
                                    <button
                                      type="button"
                                      onClick={() => handleMoveWithinGroup(index, 'prev')}
                                      disabled={!canMovePrev}
                                      className="admin-btn-icon secondary"
                                      title={canMovePrev ? `Move to previous ${slot.type} slot` : `Already at first ${slot.type} slot`}
                                      style={{
                                        padding: '4px',
                                        opacity: canMovePrev ? 1 : 0.3,
                                        cursor: canMovePrev ? 'pointer' : 'not-allowed',
                                      }}
                                    >
                                      <ChevronUp size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveWithinGroup(index, 'next')}
                                      disabled={!canMoveNext}
                                      className="admin-btn-icon secondary"
                                      title={canMoveNext ? `Move to next ${slot.type} slot` : `Already at last ${slot.type} slot`}
                                      style={{
                                        padding: '4px',
                                        opacity: canMoveNext ? 1 : 0.3,
                                        cursor: canMoveNext ? 'pointer' : 'not-allowed',
                                      }}
                                    >
                                      <ChevronDown size={15} />
                                    </button>

                                    {/* Upload Image for Replacement Button (preserves exact position and ratio) */}
                                    <label
                                      className="admin-btn secondary"
                                      style={{
                                        fontSize: '11.5px',
                                        padding: '4px 10px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        cursor: replacingImageId === img._id ? 'wait' : 'pointer',
                                        opacity: replacingImageId === img._id ? 0.7 : 1,
                                        borderRadius: '4px',
                                        border: '1px solid var(--admin-border-color)',
                                        background: '#FFFFFF',
                                        whiteSpace: 'nowrap',
                                        userSelect: 'none',
                                        marginLeft: '4px',
                                      }}
                                      title={`Upload an image to replace Position ${position} (Required: ${slot.expectedText})`}
                                    >
                                      {replacingImageId === img._id ? (
                                        <span>Replacing...</span>
                                      ) : (
                                        <>
                                          <Upload size={13} />
                                          <span>Replace</span>
                                        </>
                                      )}
                                      <input
                                        type="file"
                                        accept="image/jpeg, image/png, image/webp, image/avif"
                                        disabled={replacingImageId === img._id}
                                        onChange={(e) => handleReplaceGalleryImage(img._id, index, e)}
                                        style={{ display: 'none' }}
                                      />
                                    </label>
                                  </div>
                                </div>
                              </div>
                            );
                          }}
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
    </div>
  );
};
