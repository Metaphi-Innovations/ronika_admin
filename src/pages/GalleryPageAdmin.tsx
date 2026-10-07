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
  ChevronDown,
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
  getGalleryImages,
  createGalleryImage,
  updateGalleryImage,
  replaceGalleryImage,
  reorderGalleryImages,
  deleteGalleryImage,
  IGalleryImage,
} from '../services/galleryApi';
import { getCategories, ICategory } from '../services/projectApi';
import { getSiteSettings, updateSiteSettings } from '../services/contentApi';
import { RichTextEditor } from '../components/RichTextEditor';
import { ConfirmModal } from '../components/ConfirmModal';
import { MediaGridEditor } from '../components/MediaGridEditor';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/AdminSection';
import { Loader } from '../components/Loader';
import { countReadableChars, MAX_GALLERY_INTRO_CHARS } from '../utils/richText';
import { useAlert } from '../context/AlertContext';
import { useLiveResource } from '../context/LiveSyncContext';
import { getImageUrl } from '../utils/imageUrl';
import './GalleryAdmin.css';

export const GalleryPageAdmin: React.FC = () => {
  const alert = useAlert();



  // Server state
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [images, setImages] = useState<IGalleryImage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reorder local state (for Arrange view)
  const [orderedImages, setOrderedImages] = useState<IGalleryImage[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [arrangeViewport, setArrangeViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');



  // Preview Modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Gallery Header Intro state
  const [galleryHeader, setGalleryHeader] = useState(
    "Here's a compilation of my Work including Personal as well as Client Projects."
  );
  const [savingHeader, setSavingHeader] = useState(false);
  const [showIntroEditor, setShowIntroEditor] = useState(false);
  const [deleteImageTarget, setDeleteImageTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);


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
  const fetchData = async (isInitial = true) => {
    try {
      if (isInitial) setLoading(true);
      setError('');
      const [catsRes, imgsRes, settingsRes] = await Promise.all([
        getCategories(),
        getGalleryImages(),
        getSiteSettings(),
      ]);

      if (catsRes.success) setCategories(catsRes.data);
      if (imgsRes.success) {
        const sorted = [...imgsRes.data].sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
        );
        setImages(sorted);
        if (!hasUnsavedChanges) {
          setOrderedImages(sorted);
        }
      }
      if (settingsRes.success && settingsRes.data?.galleryHeader) {
        setGalleryHeader(settingsRes.data.galleryHeader);
      }
    } catch (err: any) {
      if (isInitial) setError("Couldn't load gallery.");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  useLiveResource('gallery', () => {
    fetchData(false);
  });

  useLiveResource('galleryCategories', () => {
    fetchData(false);
  });

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





  // Save Reordered Images
  const handleSaveOrder = async () => {
    try {
      setSavingOrder(true);
      const items = orderedImages.map((img, index) => ({
        _id: img._id,
        displayOrder: index + 1,
        layouts: img.layouts
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

  // Helper to reliably resolve category name whether category is populated object or string ID
  const getCategoryName = (cat: any) => {
    if (!cat) return 'Uncategorized';
    const catId = typeof cat === 'object' && cat ? cat._id : cat;
    if (catId && typeof catId === 'string' && catId.trim()) {
      const found = categories.find((c) => String(c._id) === String(catId) || c.name === String(catId));
      if (found) return found.name;
      // Category ID was deleted from active categories
      return 'Uncategorized';
    }
    if (cat && typeof cat === 'object' && cat.name) {
      const foundByName = categories.find((c) => c.name.toLowerCase() === cat.name.toLowerCase());
      if (foundByName) return foundByName.name;
    }
    return 'Uncategorized';
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
        let updatedImage = res.data;
        // Ensure category object is populated in local state immediately
        const catId = typeof updatedImage.category === 'object' && updatedImage.category
          ? updatedImage.category._id
          : (typeof updatedImage.category === 'string' ? updatedImage.category : editCategoryId);
        const matchedCat = categories.find((c) => String(c._id) === String(catId));
        updatedImage = { ...updatedImage, category: matchedCat || (null as any) };

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
    if (countReadableChars(galleryHeader) > MAX_GALLERY_INTRO_CHARS) {
      alert.error(`Gallery editorial introduction exceeds maximum ${MAX_GALLERY_INTRO_CHARS} characters limit.`, 'Limit Exceeded');
      return;
    }
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
        return String(catId || '') === String(selectedCategory);
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
            onClick={() => fetchData(true)}
            className="admin-btn secondary"
            style={{ fontSize: '11px', padding: '3px 8px' }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNIFIED GALLERY VIEW (RGL GRID + METADATA)                               */}
      {/* ========================================================================= */}
      <div style={{ marginTop: '1rem' }}>
        {/* Editorial Intro Section */}
        <div
          style={{
            marginBottom: '1.25rem',
            border: '1px solid var(--admin-border)',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--admin-surface-subtle)',
              borderBottom: '1px solid var(--admin-border)'
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
          </div>

          <div style={{ padding: '16px' }}>
            <RichTextEditor
              label="Editorial Introduction"
              value={galleryHeader}
              onChange={setGalleryHeader}
              maxChars={MAX_GALLERY_INTRO_CHARS}
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
        </div>

        {/* Unsaved Changes Banner */}
        {hasUnsavedChanges && (
          <div className="unsaved-banner" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>Unsaved changes</span>
              <span style={{ opacity: 0.85 }}>— Remember to save your new layout.</span>
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

        {/* Interactive RGL Grid */}
        {loading ? (
          <Loader text="Loading artwork..." minHeight="200px" />
        ) : orderedImages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 1rem',
              border: '2px dashed var(--admin-border-strong)',
              borderRadius: '8px',
              backgroundColor: 'var(--admin-surface-subtle)',
            }}
          >
            <ImageIcon size={36} color="var(--admin-text-muted)" style={{ marginBottom: '0.75rem' }} />
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
        ) : (() => {
          const filteredImages = selectedCategory === 'ALL' 
            ? orderedImages 
            : orderedImages.filter(img => {
                const catId = img.category && typeof img.category === 'object' && 'name' in img.category 
                  ? (img.category as any)._id 
                  : img.category;
                return String(catId) === selectedCategory;
              });

          return (
            <MediaGridEditor
              items={filteredImages.map(img => ({
                id: img._id,
                url: getImageUrl(img.image?.url),
                layouts: img.layouts,
                title: img.title,
                categoryName: getCategoryName(img.category),
                published: img.published
              }))}
              headerContent={
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    marginBottom: '10px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    background: 'var(--admin-surface-subtle)',
                    padding: '10px 14px',
                    borderRadius: '6px'
                  }}
                >
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    className={`admin-btn ${selectedCategory === 'ALL' ? 'primary' : 'secondary'}`}
                    style={{ padding: '4px 14px', fontSize: '12px', borderRadius: '16px' }}
                  >
                    All ({orderedImages.length})
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

                    </div>
                  ))}
                </div>
              }
              onChange={(updatedItems) => {
                const newOrdered = [...orderedImages];
                let hasChanges = false;
                
                updatedItems.forEach(u => {
                  const imgIndex = newOrdered.findIndex(i => i._id === u.id);
                  if (imgIndex !== -1 && JSON.stringify(newOrdered[imgIndex].layouts) !== JSON.stringify(u.layouts)) {
                    newOrdered[imgIndex] = { ...newOrdered[imgIndex], layouts: u.layouts };
                    hasChanges = true;
                  }
                });

                if (hasChanges) {
                  setOrderedImages(newOrdered);
                  setHasUnsavedChanges(true);
                }
              }}
              onDelete={(id) => {
                const target = orderedImages.find(img => img._id === id);
                if (target) {
                  setDeleteImageTarget({ id: target._id, title: target.title });
                }
              }}
              onReplace={(id) => {
                const target = orderedImages.find(img => img._id === id);
                if (target) {
                  setReplaceTarget(target);
                }
              }}
              onEdit={(id) => {
                const target = orderedImages.find(img => img._id === id);
                if (target) {
                  openEditModal(target);
                }
              }}
              onTogglePublish={(id) => {
                const target = orderedImages.find(img => img._id === id);
                if (target) {
                  handleTogglePublish(target);
                }
              }}
            />
          );
        })()}
      </div>



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
                                  src={getImageUrl(img.image?.url)}
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
                <label className="admin-form-label">Category <span className="admin-required-asterisk">*</span></label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="admin-form-select"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>



              <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="admin-form-label">Artwork Image File <span className="admin-required-asterisk">*</span></label>
                {filePreview ? (
                  <div
                    style={{
                      border: '1px solid var(--admin-border)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      backgroundColor: 'var(--admin-surface-subtle)',
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
                        src={getImageUrl(filePreview.url)}
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
                      border: '2px dashed var(--admin-border-strong)',
                      borderRadius: '6px',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      backgroundColor: 'var(--admin-surface-subtle)',
                      textAlign: 'center',
                    }}
                  >
                    <Upload size={20} color="var(--admin-text-main, #111)" />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Choose Artwork File</span>
                    <div style={{ display: 'inline-block', padding: '6px 12px', background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '20px', fontSize: '11.5px', color: 'var(--admin-text-main)', marginTop: '8px', textAlign: 'center', lineHeight: '1.5' }}>
                      <strong style={{ color: '#E65100', marginRight: '6px' }}>INFO:</strong>
                      <span>All image sizes and ratios accepted</span>
                    </div>
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
            <p style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '1rem' }}>
              Replacing this file preserves its position and metadata.
            </p>

            <form onSubmit={handleReplaceSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                {replacePreview ? (
                  <div
                    style={{
                      border: '1px solid var(--admin-border)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      backgroundColor: 'var(--admin-surface-subtle)',
                    }}
                  >
                    <img
                      src={getImageUrl(replacePreview.url)}
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
                      border: '2px dashed var(--admin-border-strong)',
                      borderRadius: '6px',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      backgroundColor: 'var(--admin-surface-subtle)',
                      textAlign: 'center',
                    }}
                  >
                    <Upload size={20} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Select Replacement File</span>
                    <div style={{ display: 'inline-block', padding: '6px 12px', background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '20px', fontSize: '11.5px', color: 'var(--admin-text-main)', marginTop: '8px', textAlign: 'center', lineHeight: '1.5' }}>
                      <strong style={{ color: '#E65100', marginRight: '6px' }}>INFO:</strong>
                      <span>All image sizes and ratios accepted</span>
                    </div>
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


              <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="admin-form-label">Category <span className="admin-required-asterisk">*</span></label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="admin-form-select"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.name}>
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
