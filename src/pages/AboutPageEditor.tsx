import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Upload, CheckCircle2 } from 'lucide-react';
import { getAboutContent, updateAboutContent, uploadAboutHeadshot, IAboutContent } from '../services/contentApi';
import { RichTextEditor } from '../components/RichTextEditor';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { useAlert } from '../context/AlertContext';

const validatePortraitDimensions = (
  file: File,
  minWidth = 500,
  minHeight = 600
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
          error: `Portrait dimensions (${width} × ${height} px) are below the minimum requirement of ${minWidth} × ${minHeight} px.`,
        });
      }

      if (height <= width) {
        return resolve({
          valid: false,
          width,
          height,
          error: `Portrait photo must be vertical (3:4 ratio). Selected file is horizontal or square (${width} × ${height} px).`,
        });
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

export const AboutPageEditor: React.FC = () => {
  const alert = useAlert();
  const [content, setContent] = useState<Partial<IAboutContent>>({
    heading: 'About Ronika Bhatia',
    bioParagraphs: [
      'Ronika Bhatia is a visual designer and illustrator based in Mumbai, India.',
      'Specializing in brand identity, publication design, and visual vernacular explorations.',
    ],
    headshotImage: {
      url: '',
      filename: '',
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const res = await getAboutContent();
        if (res.success && res.data) {
          setContent(res.data);
        }
      } catch (err: any) {
        setErrorMsg('Failed to load about page configuration.');
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const handleParagraphChange = (index: number, val: string) => {
    const updated = [...(content.bioParagraphs || [])];
    updated[index] = val;
    setContent({ ...content, bioParagraphs: updated });
  };

  const addParagraph = () => {
    setContent({ ...content, bioParagraphs: [...(content.bioParagraphs || []), ''] });
  };

  const removeParagraph = (index: number) => {
    const updated = (content.bioParagraphs || []).filter((_, i) => i !== index);
    setContent({ ...content, bioParagraphs: updated });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict validation: Portrait 3:4, Min 500 × 600 px (Optimal 600-1000 × 800-1250 px)
    const validation = await validatePortraitDimensions(file, 500, 600);
    if (!validation.valid) {
      alert.error(
        validation.error || 'Invalid portrait dimensions. Must be vertical 3:4 (Min 500 × 600 px).',
        'Dimension Error'
      );
      e.target.value = '';
      return;
    }

    try {
      setUploadingImage(true);
      const res = await uploadAboutHeadshot(file);
      if (res.success && res.data) {
        setContent((prev) => ({ ...prev, headshotImage: res.data.headshotImage }));
        alert.success(
          `Portrait uploaded successfully (${validation.width} × ${validation.height} px)!`,
          'Uploaded'
        );
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to upload about image', 'Upload Error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const removeImage = async () => {
    const confirmed = await alert.confirm({
      title: 'Remove Portrait Image?',
      message: 'Are you sure you want to remove the portrait photo? The default photo will be displayed.',
      confirmLabel: 'Remove',
      isDanger: true,
    });
    if (!confirmed) return;
    setContent((prev) => ({ ...prev, headshotImage: { url: '', filename: '' } }));
    alert.info('Portrait image removed.', 'Removed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      const res = await updateAboutContent({
        ...content,
        heading: content.heading || 'About Ronika Bhatia',
        bioParagraphs: (content.bioParagraphs || []).filter((p) => p.trim() !== ''),
      });
      if (res.success) {
        alert.success('About page content saved successfully!', 'Saved');
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to save about page content', 'Save Error');
      setErrorMsg(err.message || 'Failed to save about page content');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--admin-text-muted)',
          fontSize: '13px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Loading About Page Settings...
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <form onSubmit={handleSubmit}>
        <PageHeader
          title="ABOUT & BIO"
          actions={
            <button
              type="submit"
              disabled={saving}
              className="admin-btn primary"
              style={{ fontSize: '13px', padding: '0.55rem 1.4rem' }}
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          }
        />

        {errorMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: '#FFEBEE',
              color: 'var(--admin-danger)',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '13px',
              border: '1px solid #FFCDD2',
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* 1. Page Headline */}
          <AdminSection title="PAGE HEADLINE">
            <RichTextEditor
              value={content.heading || ''}
              onChange={(val) => setContent({ ...content, heading: val })}
              label="About Main Heading (Rich Text)"
              maxWords={30}
            />
          </AdminSection>

          {/* 2. Biography Paragraphs */}
          <AdminSection
            title="BIOGRAPHY PARAGRAPHS"
            actions={
              <button
                type="button"
                onClick={addParagraph}
                className="admin-btn secondary"
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                <Plus size={13} /> Add Paragraph
              </button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {(content.bioParagraphs || []).map((p, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '3px',
                      }}
                    >
                      <label
                        className="admin-form-label"
                        style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', margin: 0 }}
                      >
                        PARAGRAPH {String(idx + 1).padStart(2, '0')}
                      </label>
                      <span style={{ fontSize: '10.5px', color: 'var(--admin-text-muted)' }}>
                        Drag corner to extend ↘
                      </span>
                    </div>
                    <textarea
                      value={p}
                      onChange={(e) => handleParagraphChange(idx, e.target.value)}
                      className="admin-form-textarea"
                      style={{
                        marginBottom: 0,
                        minHeight: '48px',
                        height: '52px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        lineHeight: '1.45',
                        resize: 'vertical',
                      }}
                      rows={2}
                      placeholder={`Write biography paragraph ${idx + 1}...`}
                      required
                    />
                  </div>
                  {(content.bioParagraphs || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParagraph(idx)}
                      className="admin-btn-icon danger"
                      style={{ marginTop: '20px', height: '36px', width: '36px' }}
                      title="Remove Paragraph"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </AdminSection>

          {/* 3. Profile Portrait */}
          <AdminSection title="PROFILE PORTRAIT">
            {content.headshotImage?.url ? (
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
                    position: 'relative',
                    width: '140px',
                    height: '185px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid var(--admin-border-color)',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={content.headshotImage.url}
                    alt="About Headshot"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '5px',
                      right: '5px',
                      background: 'rgba(0,0,0,0.72)',
                      color: '#FFF',
                      fontSize: '9.5px',
                      fontWeight: 600,
                      padding: '2px 5px',
                      borderRadius: '3px',
                    }}
                  >
                    3:4
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div
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
                      marginBottom: '6px',
                    }}
                  >
                    <CheckCircle2 size={13} />
                    Portrait Active (3:4)
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
                    {content.headshotImage.filename || 'Profile Portrait'}
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
                      <span>{uploadingImage ? 'Uploading...' : 'Change Portrait'}</span>
                      <input
                        type="file"
                        accept="image/jpeg, image/png, image/webp, image/avif"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="admin-btn-icon danger"
                      title="Remove Portrait"
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
                  {uploadingImage ? 'Uploading portrait...' : 'Click to upload portrait photo'}
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
                  <span>Portrait 3:4 • Min: 500 × 600 px (Optimal: 600–1000 × 800–1250 px)</span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp, image/avif"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </AdminSection>
        </div>
      </form>
    </div>
  );
};
