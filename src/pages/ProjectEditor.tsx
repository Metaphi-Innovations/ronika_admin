import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Trash2, GripVertical, CheckCircle, AlertTriangle, Image as ImageIcon } from 'lucide-react';
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
  IImage
} from '../services/projectApi';
import { getCategories } from '../services/categoryApi';
import { generateProjectImageRows, calculateRowPattern } from '../utils/imageLayout';

const REQUIRED_RATIOS = {
  1: { name: '16:9', val: 1.77, minW: 1280, recW: 1600 },
  2: { name: '4:3', val: 1.33, minW: 800, recW: 1200 },
  3: { name: '1:1', val: 1.0, minW: 600, recW: 1000 },
};

export const ProjectEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);

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
    images: []
  });

  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const catRes = await getCategories();
        if (catRes.success) setCategories(catRes.data);

        if (isEditing && id) {
          const projRes = await getProject(id);
          if (projRes.success) {
            setFormData(projRes.data);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      let projectId = id;

      // 1. Save Basic Data
      const projectPayload = {
        ...formData,
        category: typeof formData.category === 'object' ? (formData.category as any)._id : formData.category
      };

      if (isEditing && id) {
        await updateProject(id, projectPayload);
      } else {
        const res = await createProject(projectPayload);
        projectId = res.data._id;
      }

      // 2. Upload Hero Image if added
      if (heroFile && projectId) {
        await uploadHeroImage(projectId, heroFile);
      }

      // 3. Upload Gallery Images if added
      if (galleryFiles.length > 0 && projectId) {
        await uploadGalleryImages(projectId, galleryFiles);
      }

      navigate('/projects');
    } catch (err: any) {
      alert(err.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !formData.images || !id) return;

    const items = Array.from(formData.images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state for immediate visual feedback
    setFormData(prev => ({ ...prev, images: items }));

    // Persist to backend
    const orderUpdates = items.map((img, index) => ({ imageId: img._id, order: index }));
    try {
      await reorderGalleryImages(id, orderUpdates);
    } catch (err) {
      console.error('Failed to reorder', err);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!id || !window.confirm('Delete this image permanently?')) return;
    try {
      await deleteGalleryImage(id, imageId);
      setFormData(prev => ({
        ...prev,
        images: prev.images?.filter(img => img._id !== imageId)
      }));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{ padding: '3rem' }}>Loading project editor...</div>;

  const currentImages = formData.images || [];
  const pattern = calculateRowPattern(currentImages.length + galleryFiles.length);
  
  // Map images to their assigned row sizes for validation checking
  let imgIndex = 0;
  const imageAssignments = pattern.flatMap(rowSize => {
    const slots = [];
    for (let i = 0; i < rowSize; i++) {
      slots.push({ index: imgIndex++, rowSize });
    }
    return slots;
  });

  return (
    <div>
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/projects" className="admin-btn-icon" title="Back to Projects">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="page-title">{isEditing ? 'Edit Project' : 'New Project'}</h1>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="admin-btn primary"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Project'}
        </button>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* A. BASIC INFO */}
        <section className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">A. Basic Information</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem' }}>
            <div className="admin-form-group">
              <label className="admin-form-label">Title</label>
              <input type="text" name="title" value={formData.title || ''} onChange={handleChange} className="admin-form-input" required />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Slug</label>
              <input type="text" name="slug" value={formData.slug || ''} onChange={handleChange} className="admin-form-input" required />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Category</label>
              <select name="category" value={typeof formData.category === 'object' ? formData.category._id : formData.category} onChange={handleChange} className="admin-form-select" required>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Year</label>
              <input type="text" name="year" value={formData.year || ''} onChange={handleChange} className="admin-form-input" />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Role</label>
              <input type="text" name="role" value={formData.role || ''} onChange={handleChange} className="admin-form-input" />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Client</label>
              <input type="text" name="client" value={formData.client || ''} onChange={handleChange} className="admin-form-input" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--admin-border-color)' }}>
            <label className="admin-switch-row" style={{ margin: 0, cursor: 'pointer' }}>
              <input type="checkbox" name="published" checked={formData.published || false} onChange={handleChange} style={{ width: '16px', height: '16px', accentColor: '#111' }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--admin-text-main)' }}>Published (Visible on site)</span>
            </label>
            <label className="admin-switch-row" style={{ margin: 0, cursor: 'pointer' }}>
              <input type="checkbox" name="featured" checked={formData.featured || false} onChange={handleChange} style={{ width: '16px', height: '16px', accentColor: '#111' }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--admin-text-main)' }}>Featured Project</span>
            </label>
          </div>
        </section>

        {/* B. DESCRIPTION */}
        <section className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">B. Project Description</h2>
          </div>
          <div className="admin-form-group" style={{ marginBottom: 0 }}>
            <label className="admin-form-label">Brief / Description</label>
            <textarea name="description" value={formData.description || ''} onChange={handleChange} className="admin-form-textarea" />
          </div>
        </section>

        {/* C. HERO IMAGE */}
        <section className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">C. Hero Image</h2>
          </div>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
                <strong>Required:</strong> 16:9 Aspect Ratio<br/>
                <strong>Recommended:</strong> 1920 × 1080px<br/>
                <strong>Minimum:</strong> 1280 × 720px
              </p>
              <input type="file" accept="image/jpeg, image/png, image/webp, image/avif" onChange={(e) => setHeroFile(e.target.files?.[0] || null)} className="admin-form-input" style={{ padding: '8px' }} />
              {heroFile && <p style={{ fontSize: '13px', marginTop: '0.75rem', color: 'var(--admin-success)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={14} /> File selected: {heroFile.name}</p>}
            </div>
            {formData.heroImage && !heroFile && (
              <div style={{ width: '320px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--admin-border-color)' }}>
                <img src={formData.heroImage.url} alt="Hero" style={{ width: '100%', display: 'block' }} />
                <div style={{ padding: '0.75rem', fontSize: '12px', background: '#FAFAF8', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--admin-font-accent)' }}>
                  <span>{formData.heroImage.width} × {formData.heroImage.height} PX</span>
                  <span>{formData.heroImage.aspectRatio} AR</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* D. GALLERY & LAYOUT VALIDATION */}
        <section className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">D. Gallery Layout & Sequence</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add Images:</span>
              <input type="file" multiple accept="image/jpeg, image/png, image/webp, image/avif" onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))} className="admin-form-input" style={{ padding: '6px', fontSize: '12px' }} />
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Images are dynamically chunked into rows (1, 2, or 3 images per row) based on the exact sequence. 
            Drag and drop images below to see how their layout requirements change in real-time.
          </p>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="gallery">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {currentImages.map((img, index) => {
                    const rowSize = imageAssignments[index]?.rowSize || 1;
                    const req = REQUIRED_RATIOS[rowSize as keyof typeof REQUIRED_RATIOS];
                    
                    // Validation
                    const isRatioValid = Math.abs(img.aspectRatio - req.val) < 0.1;
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
                              gap: '1.25rem',
                              padding: '1rem',
                              background: snapshot.isDragging ? '#FFFFFF' : '#FAFAF8',
                              border: `1px solid ${snapshot.isDragging ? '#111111' : 'var(--admin-border-color)'}`,
                              borderRadius: '10px',
                              boxShadow: snapshot.isDragging ? '0 8px 24px rgba(0,0,0,0.08)' : 'none',
                              transition: 'background 0.2s, box-shadow 0.2s'
                            }}
                          >
                            <div {...provided.dragHandleProps} style={{ cursor: 'grab', color: 'var(--admin-text-light)', padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
                              <GripVertical size={20} />
                            </div>

                            <div style={{ width: '120px', height: '80px', background: '#FFFFFF', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--admin-border-color)' }}>
                              <img src={img.url} alt={img.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--admin-text-main)', letterSpacing: '0.05em' }}>
                                IMG {String(index + 1).padStart(2, '0')} — {rowSize === 1 ? 'SINGLE ROW' : rowSize === 2 ? 'DOUBLE ROW' : 'TRIPLE ROW'}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', display: 'flex', gap: '1.5rem', fontFamily: 'var(--admin-font-accent)' }}>
                                <span>REQ: {req.name} ({req.minW}px)</span>
                                <span>ACTUAL: {img.width}×{img.height} ({img.aspectRatio} AR)</span>
                              </div>
                            </div>

                            <div style={{ flexShrink: 0, padding: '0 1.5rem', display: 'flex', alignItems: 'center' }}>
                              {isValid ? (
                                <span className="status-badge published">
                                  <CheckCircle size={12} style={{ marginRight: '4px' }} /> Valid
                                </span>
                              ) : (
                                <span className="status-badge" style={{ backgroundColor: '#FFF8E1', color: '#F57F17' }}>
                                  <AlertTriangle size={12} style={{ marginRight: '4px' }} /> {isRatioValid ? 'Low Res' : 'Bad AR'}
                                </span>
                              )}
                            </div>

                            <button 
                              onClick={() => handleDeleteImage(img._id)}
                              className="admin-btn-icon danger"
                              style={{ flexShrink: 0, border: 'none', background: 'transparent' }}
                              title="Delete Image"
                            >
                              <Trash2 size={18} />
                            </button>
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

          {galleryFiles.length > 0 && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#FAFAF8', border: '1px dashed var(--admin-border-color)', borderRadius: '10px' }}>
              <div style={{ fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '0.75rem', fontSize: '14px' }}>Pending Uploads ({galleryFiles.length})</div>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '13px', color: 'var(--admin-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {galleryFiles.map((f, i) => <li key={i}>{f.name}</li>)}
              </ul>
              <p style={{ fontSize: '12px', color: 'var(--admin-text-light)', marginTop: '1rem' }}>
                Save the project to process and append these images to the gallery.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
