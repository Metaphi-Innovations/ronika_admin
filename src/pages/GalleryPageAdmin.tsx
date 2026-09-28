import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Layers,
  Upload,
  Save,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Eye,
  RotateCcw,
  Edit2,
  Monitor,
  Tablet,
  Smartphone,
} from 'lucide-react';
import {
  getGalleryCategories,
  createGalleryCategory,
  deleteGalleryCategory,
  getGalleryImages,
  createGalleryImage,
  updateGalleryImage,
  replaceGalleryImage,
  reorderGalleryImages,
  deleteGalleryImage,
  IGalleryCategory,
  IGalleryImage,
} from '../services/galleryApi';
import { getSiteSettings, updateSiteSettings } from '../services/contentApi';
import { RichTextEditor } from '../components/RichTextEditor';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/AdminSection';
import { useAlert } from '../context/AlertContext';
import './GalleryAdmin.css';

export const GalleryPageAdmin: React.FC = () => {
  const alert = useAlert();

  // Active view tab: 'images' or 'arrange'
  const [activeTab, setActiveTab] = useState<'images' | 'arrange'>('images');

  // Server state
  const [categories, setCategories] = useState<IGalleryCategory[]>([]);
  const [images, setImages] = useState<IGalleryImage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reorder local state (for Arrange view)
  const [orderedImages, setOrderedImages] = useState<IGalleryImage[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [arrangeViewport, setArrangeViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Unsaved guard modal
  const [pendingTabSwitch, setPendingTabSwitch] = useState<'images' | 'arrange' | null>(null);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Active card menu popup id
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Preview Modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Gallery Header Intro state
  const [galleryHeader, setGalleryHeader] = useState(
    "Here's a compilation of my Work including Personal as well as Client Projects."
  );
  const [savingHeader, setSavingHeader] = useState(false);
  const [showIntroEditor, setShowIntroEditor] = useState(false);

  // Delete Targets for ConfirmModal
  const [deleteCatTarget, setDeleteCatTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteImageTarget, setDeleteImageTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Category Modal State
  const [newCatName, setNewCatName] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [artworkTitle, setArtworkTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Replace Image Modal State
  const [replaceTarget, setReplaceTarget] = useState<IGalleryImage | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacePreview, setReplacePreview] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [replacing, setReplacing] = useState(false);

  // Edit Metadata Modal State
  const [editTarget, setEditTarget] = useState<IGalleryImage | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editingImage, setEditingImage] = useState(false);

  // Fetch all gallery data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [catsRes, imgsRes, settingsRes] = await Promise.all([
        getGalleryCategories(),
        getGalleryImages(),
        getSiteSettings(),
      ]);

      if (catsRes.success) setCategories(catsRes.data);
      if (imgsRes.success) {
        const sorted = [...imgsRes.data].sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
        );
        setImages(sorted);
        setOrderedImages(sorted);
        setHasUnsavedChanges(false);
      }
      if (settingsRes.success && settingsRes.data?.galleryHeader) {
        setGalleryHeader(settingsRes.data.galleryHeader);
      }
    } catch (err: any) {
      setError("Couldn't load gallery.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Browser navigation warning when unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes.';
        return 'You have unsaved changes.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Close menus on outside click
  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveMenuId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Tab switching with unsaved changes guard
  const handleTabChange = (newTab: 'images' | 'arrange') => {
    if (newTab === activeTab) return;
    if (hasUnsavedChanges) {
      setPendingTabSwitch(newTab);
      return;
    }
    setActiveTab(newTab);
  };

  const confirmDiscardTabSwitch = () => {
    if (pendingTabSwitch) {
      setOrderedImages([...images]);
      setHasUnsavedChanges(false);
      setActiveTab(pendingTabSwitch);
      setPendingTabSwitch(null);
    }
  };

  // Reorder Actions (Left-to-right sequence 1 2 3, 4 5 6, 7 8 9...)
  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= orderedImages.length || fromIndex === toIndex) return;
    const updated = [...orderedImages];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setOrderedImages(updated);
    setHasUnsavedChanges(true);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, index: number) => {
    if (dropTargetIndex === index) {
      setDropTargetIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDropTargetIndex(null);
    const sourceIndex = draggedIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      moveImage(sourceIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  // Save Reordered Images
  const handleSaveOrder = async () => {
    try {
      setSavingOrder(true);
      const items = orderedImages.map((img, index) => ({
        _id: img._id,
        displayOrder: index + 1,
      }));

      const res = await reorderGalleryImages(items);
      if (res.success) {
        alert.success('Changes saved.');
        setImages([...orderedImages]);
        setHasUnsavedChanges(false);
      } else {
        alert.error("Couldn't save changes.");
      }
    } catch (err: any) {
      alert.error("Couldn't save changes.");
    } finally {
      setSavingOrder(false);
    }
  };

  // Discard Unsaved Changes
  const handleDiscardOrder = () => {
    setOrderedImages([...images]);
    setHasUnsavedChanges(false);
  };

  // Category Actions
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await createGalleryCategory({ name: newCatName.trim() });
      if (res.success) {
        setCategories([...categories, res.data]);
        setNewCatName('');
        setShowCatModal(false);
        alert.success(`Category "${res.data.name}" created.`);
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to create category');
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCatTarget) return;
    try {
      setDeleting(true);
      await deleteGalleryCategory(deleteCatTarget.id);
      setCategories(categories.filter((c) => c._id !== deleteCatTarget.id));
      alert.info(`Category "${deleteCatTarget.name}" deleted.`);
      setDeleteCatTarget(null);
    } catch (err: any) {
      alert.error(err.message || 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  // Upload Artwork — Zero dimension or ratio validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (filePreview?.url) URL.revokeObjectURL(filePreview.url);

    setSelectedFile(file);
    setFilePreview({
      url: URL.createObjectURL(file),
      name: file.name,
    });
    if (!artworkTitle) {
      setArtworkTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      alert.warning('Please select a category.');
      return;
    }
    if (!selectedFile) {
      alert.warning('Please choose an artwork image file.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      const finalTitle = artworkTitle.trim() || selectedFile.name.replace(/\.[^/.]+$/, '') || 'Artwork';
      formData.append('title', finalTitle);
      formData.append('category', categoryId);
      formData.append('gallery_image', selectedFile);

      const res = await createGalleryImage(formData);
      if (res.success) {
        setShowUploadModal(false);
        setCategoryId('');
        setArtworkTitle('');
        if (filePreview?.url) URL.revokeObjectURL(filePreview.url);
        setSelectedFile(null);
        setFilePreview(null);
        alert.success('Artwork added.');

        const updatedImages = [...images, res.data];
        setImages(updatedImages);
        setOrderedImages(updatedImages);
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to upload artwork');
    } finally {
      setUploading(false);
    }
  };

  // Replace Image — Zero dimension or ratio validation
  const handleReplaceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (replacePreview?.url) URL.revokeObjectURL(replacePreview.url);

    setReplaceFile(file);
    setReplacePreview({
      url: URL.createObjectURL(file),
      name: file.name,
    });
  };

  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceTarget || !replaceFile) return;

    try {
      setReplacing(true);
      const formData = new FormData();
      formData.append('gallery_image', replaceFile);

      const res = await replaceGalleryImage(replaceTarget._id, formData);
      if (res.success) {
        const updatedImage = res.data;
        const updateList = (list: IGalleryImage[]) =>
          list.map((item) => (item._id === replaceTarget._id ? updatedImage : item));

        setImages(updateList(images));
        setOrderedImages(updateList(orderedImages));
        alert.success('Artwork replaced.');
        setReplaceTarget(null);
        setReplaceFile(null);
        if (replacePreview?.url) URL.revokeObjectURL(replacePreview.url);
        setReplacePreview(null);
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to replace artwork');
    } finally {
      setReplacing(false);
    }
  };

  // Edit Image Info
  const openEditModal = (img: IGalleryImage) => {
    setEditTarget(img);
    setEditTitle(img.title || '');
    const currentCatId =
      typeof img.category === 'object' && img.category ? img.category._id : (img.category as string) || '';
    setEditCategoryId(currentCatId);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      setEditingImage(true);
      const res = await updateGalleryImage(editTarget._id, {
        title: editTitle.trim(),
        category: editCategoryId,
      });

      if (res.success) {
        const updatedImage = res.data;
        const updateList = (list: IGalleryImage[]) =>
          list.map((item) => (item._id === editTarget._id ? updatedImage : item));

        setImages(updateList(images));
        setOrderedImages(updateList(orderedImages));
        alert.success('Artwork information updated.');
        setEditTarget(null);
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to update artwork');
    } finally {
      setEditingImage(false);
    }
  };

  // Toggle Visibility
  const handleTogglePublish = async (img: IGalleryImage) => {
    try {
      const res = await updateGalleryImage(img._id, { published: !img.published });
      if (res.success) {
        const updateList = (list: IGalleryImage[]) =>
          list.map((item) => (item._id === img._id ? { ...item, published: !img.published } : item));
        setImages(updateList(images));
        setOrderedImages(updateList(orderedImages));
        alert.success(`Artwork is now ${!img.published ? 'published' : 'hidden'}.`);
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to update visibility');
    }
  };

  // Delete Artwork
  const confirmDeleteImage = async () => {
    if (!deleteImageTarget) return;
    try {
      setDeleting(true);
      await deleteGalleryImage(deleteImageTarget.id);
      const filtered = images.filter((i) => i._id !== deleteImageTarget.id);
      const filteredOrdered = orderedImages.filter((i) => i._id !== deleteImageTarget.id);

      setImages(filtered);
      setOrderedImages(filteredOrdered);
      alert.info('Artwork deleted.');
      setDeleteImageTarget(null);
    } catch (err: any) {
      alert.error(err.message || 'Failed to delete artwork');
    } finally {
      setDeleting(false);
    }
  };

  // Save Editorial Intro
  const handleSaveHeader = async () => {
    try {
      setSavingHeader(true);
      const res = await updateSiteSettings({ galleryHeader });
      if (res.success) {
        alert.success('Gallery introduction updated.');
        setShowIntroEditor(false);
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to save intro text');
    } finally {
      setSavingHeader(false);
    }
  };

  // Filtered images for Library view
  const libraryImages =
    selectedCategory === 'ALL'
      ? images
      : images.filter((img) => {
        const catId = typeof img.category === 'object' && img.category ? img.category._id : img.category;
        return catId === selectedCategory;
      });

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="GALLERY ARTWORK"
        subtitle="Manage the images shown on your portfolio."
        actions={
          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowCatModal(true)}
              className="admin-btn secondary"
              style={{ fontSize: '13px' }}
            >
              <Layers size={14} />
              <span>Add Category</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="admin-btn primary"
              style={{ fontSize: '13px' }}
            >
              <Plus size={14} />
              <span>Add Images</span>
            </button>
          </div>
        }
      />

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FFEBEE',
            color: '#B71C1C',
            borderRadius: '6px',
            marginBottom: '1rem',
            border: '1px solid #FFCDD2',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            onClick={fetchData}
            className="admin-btn secondary"
            style={{ fontSize: '11px', padding: '3px 8px' }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Two Simple Modes Tabs */}
      <div className="gallery-admin-tabs">
        <button
          type="button"
          onClick={() => handleTabChange('images')}
          className={`gallery-admin-tab-btn ${activeTab === 'images' ? 'active' : ''}`}
        >
          <ImageIcon size={15} />
          <span>Images</span>
          <span className="tab-badge-pill">{images.length}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('arrange')}
          className={`gallery-admin-tab-btn ${activeTab === 'arrange' ? 'active' : ''}`}
        >
          <GripVertical size={15} />
          <span>Arrange</span>
          {hasUnsavedChanges && (
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#D97706',
              }}
              title="Unsaved changes"
            />
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: IMAGES VIEW                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'images' && (
        <div>
          {/* Optional Editorial Intro Dropdown */}
          <div
            style={{
              marginBottom: '1.25rem',
              border: '1px solid var(--admin-border-color, #E2E0D8)',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
            }}
          >
            <div
              onClick={() => setShowIntroEditor(!showIntroEditor)}
              style={{
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                backgroundColor: '#FAFAF8',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--admin-text-main, #111)',
                }}
              >
                Editorial Intro Text
              </span>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-muted, #666)' }}>
                {showIntroEditor ? 'Close' : 'Edit Text'}
              </span>
            </div>

            {showIntroEditor && (
              <div style={{ padding: '16px' }}>
                <RichTextEditor
                  label="Editorial Introduction"
                  value={galleryHeader}
                  onChange={setGalleryHeader}
                />
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleSaveHeader}
                    disabled={savingHeader}
                    className="admin-btn primary"
                    style={{ fontSize: '12px' }}
                  >
                    <Save size={13} />
                    <span>{savingHeader ? 'Saving...' : 'Save Intro'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`admin-btn ${selectedCategory === 'ALL' ? 'primary' : 'secondary'}`}
              style={{ padding: '4px 14px', fontSize: '12px', borderRadius: '16px' }}
            >
              All ({images.length})
            </button>
            {categories.map((cat) => (
              <div key={cat._id} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <button
                  onClick={() => setSelectedCategory(cat._id)}
                  className={`admin-btn ${selectedCategory === cat._id ? 'primary' : 'secondary'}`}
                  style={{ padding: '4px 14px', fontSize: '12px', borderRadius: '16px' }}
                >
                  {cat.name}
                </button>
                <button
                  onClick={() => setDeleteCatTarget({ id: cat._id, name: cat.name })}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--admin-text-muted, #666)',
                    padding: '2px',
                  }}
                  title="Delete Category"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Image Library Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#888', fontSize: '13px' }}>
              Loading artwork...
            </div>
          ) : libraryImages.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 1rem',
                border: '1px dashed var(--admin-border-color, #E2E0D8)',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <ImageIcon size={36} color="#BBB" style={{ marginBottom: '0.75rem' }} />
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--admin-text-main, #111)',
                  margin: '0 0 1rem 0',
                }}
              >
                No artwork added yet.
              </p>
              <button onClick={() => setShowUploadModal(true)} className="admin-btn primary">
                <Plus size={14} /> Add Images
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '18px',
              }}
            >
              {libraryImages.map((item) => {
                const catName =
                  item.category && typeof item.category === 'object' && item.category.name
                    ? item.category.name
                    : 'Uncategorized';
                return (
                  <div
                    key={item._id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--admin-border-color, #E2E0D8)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Visual Preview */}
                    <div
                      style={{
                        width: '100%',
                        height: '175px',
                        backgroundColor: '#F8F8F6',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={item.image?.url}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          backgroundColor: 'rgba(0,0,0,0.75)',
                          color: '#FFFFFF',
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {catName}
                      </span>
                    </div>

                    {/* Metadata Content */}
                    <div
                      style={{
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        flex: 1,
                      }}
                    >
                      <div style={{ marginBottom: '8px' }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--admin-text-main, #111)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--admin-text-muted, #666)' }}>
                          {catName}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderTop: '1px solid var(--admin-border-color, #E2E0D8)',
                          paddingTop: '8px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(item)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <StatusBadge status={item.published ? 'published' : 'draft'} />
                        </button>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="admin-btn-icon"
                            title="Edit Info"
                            style={{ padding: '4px' }}
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setReplaceTarget(item)}
                            className="admin-btn-icon"
                            title="Replace Image"
                            style={{ padding: '4px' }}
                          >
                            <RotateCcw size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteImageTarget({ id: item._id, title: item.title })}
                            className="admin-btn-icon danger"
                            title="Delete"
                            style={{ padding: '4px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: ARRANGE VIEW (UNIFORM 3-COLUMN REORDER GRID)                      */}
      {/* ========================================================================= */}
      {activeTab === 'arrange' && (
        <div>
          {/* Top Bar with Responsive Viewport Selector */}
          <div className="arrange-top-bar">
            <div className="arrange-title-wrap">
              <h3>Arrange Gallery</h3>
              <p>Drag images to set their order (1 2 3, 4 5 6, 7 8 9... left to right).</p>
            </div>

            <div className="arrange-actions">
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setArrangeViewport('desktop')}
                  className={`admin-btn ${arrangeViewport === 'desktop' ? 'primary' : 'secondary'}`}
                  style={{ fontSize: '11.5px', padding: '4px 10px' }}
                  title="3 Columns (Desktop)"
                >
                  <Monitor size={13} /> 3 Col
                </button>
                <button
                  type="button"
                  onClick={() => setArrangeViewport('tablet')}
                  className={`admin-btn ${arrangeViewport === 'tablet' ? 'primary' : 'secondary'}`}
                  style={{ fontSize: '11.5px', padding: '4px 10px' }}
                  title="2 Columns (Tablet)"
                >
                  <Tablet size={13} /> 2 Col
                </button>
                <button
                  type="button"
                  onClick={() => setArrangeViewport('mobile')}
                  className={`admin-btn ${arrangeViewport === 'mobile' ? 'primary' : 'secondary'}`}
                  style={{ fontSize: '11.5px', padding: '4px 10px' }}
                  title="1 Column (Mobile)"
                >
                  <Smartphone size={13} /> 1 Col
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="admin-btn secondary"
                style={{ fontSize: '12.5px' }}
              >
                <Eye size={14} />
                <span>Live Website Preview</span>
              </button>
            </div>
          </div>

          {/* Unsaved Changes Banner */}
          {hasUnsavedChanges && (
            <div className="unsaved-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600 }}>Unsaved changes</span>
                <span style={{ opacity: 0.85 }}>— Remember to save your new order.</span>
              </div>
              <div className="unsaved-banner-actions">
                <button
                  type="button"
                  onClick={handleDiscardOrder}
                  disabled={savingOrder}
                  className="admin-btn secondary"
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSaveOrder}
                  disabled={savingOrder}
                  className="admin-btn primary"
                  style={{ fontSize: '12px', padding: '5px 14px' }}
                >
                  <Save size={13} />
                  <span>{savingOrder ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {orderedImages.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 1rem',
                border: '1px dashed var(--admin-border-color, #E2E0D8)',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <p style={{ fontSize: '14px', color: '#666', margin: '0 0 1rem 0' }}>
                No artwork added yet.
              </p>
              <button onClick={() => setShowUploadModal(true)} className="admin-btn primary">
                <Plus size={14} /> Add Images
              </button>
            </div>
          ) : (
            <div className={`arrange-grid-container viewport-${arrangeViewport}`}>
              {orderedImages.map((item, index) => {
                const positionNumber = String(index + 1).padStart(2, '0');
                const catName =
                  item.category && typeof item.category === 'object' && item.category.name
                    ? item.category.name
                    : 'Gallery';
                const isDragging = draggedIndex === index;
                const isDropTarget = dropTargetIndex === index && draggedIndex !== index;

                return (
                  <div
                    key={item._id}
                    className={`arrange-card ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''
                      }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={(e) => handleDragLeave(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Visual Card Image — Uniform frame for stable dragging */}
                    <div className="arrange-card-visual">
                      <img src={item.image?.url} alt={item.title} className="arrange-card-img" />
                      <div className="position-badge">Position {positionNumber}</div>
                      <div className="arrange-drag-handle" title="Drag to reorder">
                        <GripVertical size={14} />
                      </div>
                    </div>

                    {/* Information Bar */}
                    <div className="arrange-card-info">
                      <div className="arrange-card-title">{item.title}</div>
                      <div className="arrange-card-cat">{catName}</div>
                    </div>

                    {/* Bottom Controls */}
                    <div className="arrange-card-actions">
                      <div className="arrange-order-btn-group">
                        <button
                          type="button"
                          className="arrange-order-btn"
                          disabled={index === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveImage(index, index - 1);
                          }}
                          aria-label={`Move ${item.title} earlier`}
                          title="Move left/earlier"
                        >
                          <ChevronLeft size={14} />
                          <span>Move Left</span>
                        </button>
                        <button
                          type="button"
                          className="arrange-order-btn"
                          disabled={index === orderedImages.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveImage(index, index + 1);
                          }}
                          aria-label={`Move ${item.title} later`}
                          title="Move right/later"
                        >
                          <span>Move Right</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Dropdown ⋯ */}
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          className="card-menu-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === item._id ? null : item._id);
                          }}
                          aria-label="Image actions"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {activeMenuId === item._id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              bottom: '28px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid var(--admin-border-color, #E2E0D8)',
                              borderRadius: '6px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              zIndex: 50,
                              minWidth: '130px',
                              overflow: 'hidden',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                openEditModal(item);
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 12px',
                                background: 'none',
                                border: 'none',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'var(--admin-text-main, #111)',
                              }}
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setReplaceTarget(item);
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 12px',
                                background: 'none',
                                border: 'none',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'var(--admin-text-main, #111)',
                              }}
                            >
                              <RotateCcw size={13} /> Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setDeleteImageTarget({ id: item._id, title: item.title });
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 12px',
                                background: 'none',
                                border: 'none',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: '#DC2626',
                              }}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: UNSAVED CHANGES TAB-SWITCH GUARD                                 */}
      {/* ========================================================================= */}
      {pendingTabSwitch && (
        <ConfirmModal
          isOpen={Boolean(pendingTabSwitch)}
          title="You have unsaved changes."
          message="Switching views without saving will discard your new arrangement."
          confirmLabel="Discard"
          cancelLabel="Stay"
          onConfirm={confirmDiscardTabSwitch}
          onClose={() => setPendingTabSwitch(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LIVE WEBSITE PREVIEW MODAL (EXACT PORTFOLIO REPLICA)            */}
      {/* ========================================================================= */}
      {showPreviewModal && (
        <div className="preview-modal-backdrop">
          <div className="preview-modal-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em' }}>
                LIVE WEBSITE GALLERY PREVIEW (1 2 3, 4 5 6, 7 8 9... LEFT TO RIGHT)
              </span>
              <div className="preview-viewport-switcher">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`preview-device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                >
                  <Monitor size={14} /> Desktop (3 Col)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={`preview-device-btn ${previewDevice === 'tablet' ? 'active' : ''}`}
                >
                  <Tablet size={14} /> Tablet (2 Col)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`preview-device-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
                >
                  <Smartphone size={14} /> Mobile (1 Col)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="preview-stage-container">
            <div className={`preview-viewport-frame ${previewDevice}`}>
              <div className="preview-website-page">
                <div className="preview-website-container">
                  {/* Exact Website Subtitle Header */}
                  <div className="preview-gallery-header-block">
                    <h2
                      className="preview-gallery-subtitle-text"
                      dangerouslySetInnerHTML={{ __html: galleryHeader }}
                    />
                  </div>

                  {/* Exact Website Filter Pills Row */}
                  <div className="preview-gallery-filter-pills-row">
                    <span className="preview-gallery-filter-pill active">ALL</span>
                    {categories.map((c) => (
                      <span key={c._id} className="preview-gallery-filter-pill">
                        {c.name.toUpperCase()}
                      </span>
                    ))}
                  </div>

                  {/* Exact 3-Column Exhibition Wall Grid Left-to-Right */}
                  <div className="preview-gallery-wall">
                    {(() => {
                      const colCount = previewDevice === 'mobile' ? 1 : previewDevice === 'tablet' ? 2 : 3;
                      const cols: Array<Array<{ img: IGalleryImage; orderIdx: number }>> = Array.from(
                        { length: colCount },
                        () => []
                      );
                      orderedImages
                        .filter((img) => img.published)
                        .forEach((img, idx) => {
                          cols[idx % colCount].push({ img, orderIdx: idx + 1 });
                        });
                      return cols.map((colGroup, colIdx) => (
                        <div key={colIdx} className="preview-masonry-column">
                          {colGroup.map(({ img, orderIdx }) => (
                            <div key={img._id} className="preview-wall-card">
                              <div className="preview-card-frame">
                                <img
                                  src={img.image?.url}
                                  alt={img.title}
                                  className="preview-card-img"
                                />
                                <div className="preview-position-tag">
                                  {String(orderIdx).padStart(2, '0')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: UPLOAD ARTWORK MODAL (NO DIMENSION / RATIO RESTRICTION)          */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="admin-card"
            style={{ width: '460px', padding: '1.25rem', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h3 style={{ fontSize: '14.5px', fontWeight: 600, marginBottom: '0.75rem' }}>
              ADD ARTWORK
            </h3>

            <form onSubmit={handleUploadImage}>
              <div className="admin-form-group" style={{ marginBottom: '0.875rem' }}>
                <label className="admin-form-label">Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
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
              </div>

              <div className="admin-form-group" style={{ marginBottom: '0.875rem' }}>
                <label className="admin-form-label">Artwork Title</label>
                <input
                  type="text"
                  value={artworkTitle}
                  onChange={(e) => setArtworkTitle(e.target.value)}
                  className="admin-form-input"
                  placeholder="Auto-derived from filename if empty"
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="admin-form-label">Artwork Image File *</label>
                {filePreview ? (
                  <div
                    style={{
                      border: '1px solid var(--admin-border-color, #E2E0D8)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      backgroundColor: '#FAFAF8',
                    }}
                  >
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={filePreview.url}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {filePreview.name}
                      </div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          color: '#2E7D32',
                          fontWeight: 500,
                        }}
                      >
                        <CheckCircle2 size={12} />
                        Ready to upload
                      </span>
                    </div>
                    <label
                      className="admin-btn secondary"
                      style={{ cursor: 'pointer', padding: '3px 8px', fontSize: '11px' }}
                    >
                      Change
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                ) : (
                  <label
                    style={{
                      border: '2px dashed var(--admin-border-color, #E2E0D8)',
                      borderRadius: '6px',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      backgroundColor: '#FAFAF8',
                      textAlign: 'center',
                    }}
                  >
                    <Upload size={20} color="var(--admin-text-main, #111)" />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Choose Artwork File</span>
                    <span style={{ fontSize: '11px', color: '#666' }}>All image sizes and ratios accepted</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                      required
                    />
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    if (filePreview?.url) URL.revokeObjectURL(filePreview.url);
                    setFilePreview(null);
                    setSelectedFile(null);
                  }}
                  className="admin-btn secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn primary"
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? 'Adding...' : 'Add Artwork'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: REPLACE IMAGE MODAL (NO DIMENSION / RATIO RESTRICTION)          */}
      {/* ========================================================================= */}
      {replaceTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="admin-card" style={{ width: '440px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 600, marginBottom: '0.5rem' }}>
              REPLACE ARTWORK IMAGE
            </h3>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '1rem' }}>
              Replacing this file preserves its position and metadata.
            </p>

            <form onSubmit={handleReplaceSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                {replacePreview ? (
                  <div
                    style={{
                      border: '1px solid var(--admin-border-color, #E2E0D8)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      backgroundColor: '#FAFAF8',
                    }}
                  >
                    <img
                      src={replacePreview.url}
                      alt="New Preview"
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {replacePreview.name}
                      </div>
                      <span style={{ fontSize: '11px', color: '#2E7D32', fontWeight: 500 }}>
                        <CheckCircle2 size={12} />
                        Ready to replace
                      </span>
                    </div>
                    <label
                      className="admin-btn secondary"
                      style={{ cursor: 'pointer', padding: '3px 8px', fontSize: '11px' }}
                    >
                      Change
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReplaceFileSelect}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                ) : (
                  <label
                    style={{
                      border: '2px dashed var(--admin-border-color, #E2E0D8)',
                      borderRadius: '6px',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      backgroundColor: '#FAFAF8',
                      textAlign: 'center',
                    }}
                  >
                    <Upload size={20} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Select Replacement File</span>
                    <span style={{ fontSize: '11px', color: '#666' }}>All image sizes and ratios accepted</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReplaceFileSelect}
                      style={{ display: 'none' }}
                      required
                    />
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setReplaceTarget(null);
                    setReplaceFile(null);
                    if (replacePreview?.url) URL.revokeObjectURL(replacePreview.url);
                    setReplacePreview(null);
                  }}
                  className="admin-btn secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn primary"
                  disabled={replacing || !replaceFile}
                >
                  {replacing ? 'Replacing...' : 'Replace Artwork'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: EDIT METADATA MODAL                                              */}
      {/* ========================================================================= */}
      {editTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="admin-card" style={{ width: '400px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 600, marginBottom: '0.875rem' }}>
              EDIT ARTWORK INFORMATION
            </h3>

            <form onSubmit={handleEditSubmit}>
              <div className="admin-form-group" style={{ marginBottom: '0.875rem' }}>
                <label className="admin-form-label">Title *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="admin-form-input"
                  required
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="admin-form-label">Category *</label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
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
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="admin-btn secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn primary" disabled={editingImage}>
                  {editingImage ? 'Saving...' : 'Save Info'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CREATE CATEGORY MODAL                                            */}
      {/* ========================================================================= */}
      {showCatModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="admin-card" style={{ width: '380px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 600, marginBottom: '0.875rem' }}>
              CREATE CATEGORY
            </h3>
            <form onSubmit={handleCreateCategory}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="admin-label">Category Name *</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="admin-input"
                  placeholder="e.g. Photography"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="admin-btn secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn primary">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: CONFIRM DELETE MODALS                                            */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={Boolean(deleteCatTarget)}
        title="Delete Category?"
        message={`Are you sure you want to delete "${deleteCatTarget?.name}"?`}
        confirmLabel="Delete Category"
        isLoading={deleting}
        onConfirm={confirmDeleteCategory}
        onClose={() => setDeleteCatTarget(null)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteImageTarget)}
        title="Delete Artwork?"
        message={`Are you sure you want to delete "${deleteImageTarget?.title}"?`}
        confirmLabel="Delete Artwork"
        isLoading={deleting}
        onConfirm={confirmDeleteImage}
        onClose={() => setDeleteImageTarget(null)}
      />
    </div>
  );
};
