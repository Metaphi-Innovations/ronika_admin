import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, ArrowUp, ArrowDown, Trash2, Upload, AlertTriangle, Plus, Eye, EyeOff } from 'lucide-react';
import {
  getHomeContent,
  updateHomeContent,
  uploadHomeHero,
  uploadHomeIntro,
  getSiteSettings,
  updateSiteSettings,
  IHomeContent,
  ISiteSettings,
  ISocialButton
} from '../services/contentApi';
import { getProjects, IProject } from '../services/projectApi';
import { getServices, createService, updateService, deleteService, IService } from '../services/serviceApi';
import { StatusBadge } from '../components/StatusBadge';
import { RichTextEditor } from '../components/RichTextEditor';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { countReadableWords, MAX_HERO_QUOTE_WORDS, MAX_CLIENT_BIO_WORDS } from '../utils/richText';
import { useAlert } from '../context/AlertContext';

export const HomePageEditor: React.FC = () => {
  const alert = useAlert();
  const [content, setContent] = useState<Partial<IHomeContent>>({
    heroQuote: 'Works of art make rules, rules do not make works of art.',
    heroQuoteAuthor: 'Claude Debussy',
    servicesSectionTitle: 'Services I offer:',
    introTitle: 'Some Projects I’ve Worked on',
    introText: 'Hello, I am Ronika. I am a Visual Designer & Illustrator based in India.',
    ctaText: 'View All Projects',
    ctaLink: '/work',
    featuredProjects: [],
  });

  const [settings, setSettings] = useState<Partial<ISiteSettings>>({
    socialButtons: [],
  });

  const [availableProjects, setAvailableProjects] = useState<IProject[]>([]);
  const [services, setServices] = useState<IService[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingIntro, setUploadingIntro] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [homeRes, projectsRes, servicesRes, settingsRes] = await Promise.all([
        getHomeContent(),
        getProjects(),
        getServices(),
        getSiteSettings(),
      ]);

      if (homeRes.success && homeRes.data) {
        setContent(homeRes.data);
      }
      if (projectsRes.success && projectsRes.data) {
        setAvailableProjects(projectsRes.data);
      }
      if (servicesRes.success && servicesRes.data) {
        setServices(servicesRes.data);
      }
      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to load home page configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Validation helpers
  const quoteWordCount = countReadableWords(content.heroQuote);
  const isQuoteOverLimit = quoteWordCount > MAX_HERO_QUOTE_WORDS;

  const bioWordCount = countReadableWords(content.introText);
  const isBioOverLimit = bioWordCount > MAX_CLIENT_BIO_WORDS;

  const rawFeaturedList = content.featuredProjects || [];
  const selectedFeaturedIds = rawFeaturedList.map((p: any) => (typeof p === 'object' ? p._id : p));

  const validFeaturedCount = selectedFeaturedIds.length === 7;
  const hasDuplicateFeatured = new Set(selectedFeaturedIds).size !== selectedFeaturedIds.length;

  const invalidProjectItems = selectedFeaturedIds.map(id => {
    const proj = availableProjects.find(p => p._id === id);
    if (!proj) return { id, reason: 'Deleted or non-existent project' };
    if (!proj.published) return { id, title: proj.title, reason: 'Unpublished draft project' };
    return null;
  }).filter(Boolean);

  const isFeaturedValid = validFeaturedCount && !hasDuplicateFeatured && invalidProjectItems.length === 0;

  const activeServicesCount = services.filter(s => s.isActive).length;
  const isServicesValid = activeServicesCount === 3;

  // Client-Side Image Dimension & Orientation Strict Validation
  const validateImageDimensions = (
    file: File,
    minWidth: number,
    minHeight: number,
    type: 'landscape' | 'portrait'
  ): Promise<{ valid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        return resolve({ valid: false, error: 'Selected file is not an image.' });
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        if (type === 'landscape') {
          if (width < minWidth || height < minHeight) {
            return resolve({
              valid: false,
              error: `Hero Artwork resolution is too low (${width}×${height}px). Minimum required dimensions are ${minWidth}×${minHeight}px (Landscape). Optimal: 1920×1080px to 2560×1440px.`
            });
          }
          if (width < height) {
            return resolve({
              valid: false,
              error: `Hero Artwork must be a horizontal/landscape image (Width must be greater than Height). Uploaded image is vertical (${width}×${height}px).`
            });
          }
        } else if (type === 'portrait') {
          if (width < minWidth || height < minHeight) {
            return resolve({
              valid: false,
              error: `Client Portrait resolution is too low (${width}×${height}px). Minimum required dimensions are ${minWidth}×${minHeight}px (Portrait 3:4). Optimal: 600×800px to 1000×1250px.`
            });
          }
          if (width > height) {
            return resolve({
              valid: false,
              error: `Client Portrait must be a vertical/portrait image (3:4 ratio). Uploaded image is horizontal (${width}×${height}px).`
            });
          }
        }

        return resolve({ valid: true });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ valid: false, error: 'Could not process image file. Please choose a valid JPG, PNG, or WebP image.' });
      };

      img.src = objectUrl;
    });
  };

  // Image Upload Handlers
  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    const validation = await validateImageDimensions(file, 1600, 900, 'landscape');
    if (!validation.valid) {
      alert.error(validation.error || 'Invalid hero artwork dimensions.', 'Upload Error');
      setErrorMsg(validation.error || 'Invalid hero artwork dimensions.');
      e.target.value = '';
      return;
    }

    try {
      setUploadingHero(true);
      const res = await uploadHomeHero(file);
      if (res.success && res.data) {
        setContent(prev => ({ ...prev, heroImage: res.data.heroImage }));
        alert.success('Hero artwork uploaded successfully!', 'Image Uploaded');
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to upload hero image', 'Upload Failed');
      setErrorMsg(err.message || 'Failed to upload hero image');
    } finally {
      setUploadingHero(false);
      e.target.value = '';
    }
  };

  const removeHeroImage = async () => {
    const confirmed = await alert.confirm({
      title: 'Remove Hero Artwork?',
      message: 'Are you sure you want to remove the hero artwork image? The default artwork will be shown on the homepage.',
      confirmLabel: 'Remove',
      isDanger: true,
    });
    if (!confirmed) return;
    setContent(prev => ({ ...prev, heroImage: { url: '', filename: '' } }));
    alert.info('Hero artwork removed.', 'Removed');
  };

  const handleIntroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    const validation = await validateImageDimensions(file, 500, 600, 'portrait');
    if (!validation.valid) {
      alert.error(validation.error || 'Invalid client portrait dimensions.', 'Upload Error');
      setErrorMsg(validation.error || 'Invalid client portrait dimensions.');
      e.target.value = '';
      return;
    }

    try {
      setUploadingIntro(true);
      const res = await uploadHomeIntro(file);
      if (res.success && res.data) {
        setContent(prev => ({ ...prev, introImage: res.data.introImage }));
        alert.success('Client portrait image uploaded successfully!', 'Image Uploaded');
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to upload client portrait image', 'Upload Failed');
      setErrorMsg(err.message || 'Failed to upload client portrait image');
    } finally {
      setUploadingIntro(false);
      e.target.value = '';
    }
  };

  const removeIntroImage = async () => {
    const confirmed = await alert.confirm({
      title: 'Remove Portrait Image?',
      message: 'Are you sure you want to remove the portrait photo? The default portrait will be shown on the homepage.',
      confirmLabel: 'Remove',
      isDanger: true,
    });
    if (!confirmed) return;
    setContent(prev => ({ ...prev, introImage: { url: '', filename: '' } }));
    alert.info('Client portrait removed.', 'Removed');
  };

  // Featured Project Handlers
  const toggleFeaturedProject = (projectId: string) => {
    if (selectedFeaturedIds.includes(projectId)) {
      const updated = rawFeaturedList.filter((p: any) => (typeof p === 'object' ? p._id : p) !== projectId);
      setContent(prev => ({ ...prev, featuredProjects: updated }));
    } else {
      if (selectedFeaturedIds.length >= 7) {
        alert.warning('Exactly 7 projects must be selected. Remove a project before adding a new one.', 'Limit Reached');
        return;
      }
      const projObj = availableProjects.find(p => p._id === projectId);
      setContent(prev => ({ ...prev, featuredProjects: [...(prev.featuredProjects || []), projObj || projectId] }));
    }
  };

  const moveFeatured = (index: number, direction: 'up' | 'down') => {
    const list = [...rawFeaturedList];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    setContent(prev => ({ ...prev, featuredProjects: list }));
  };

  const removeFeatured = async (index: number) => {
    const list = [...rawFeaturedList];
    const projObj = availableProjects.find(p => p._id === list[index]) || list[index];
    const title = projObj?.title || 'this project';

    const confirmed = await alert.confirm({
      title: 'Remove Featured Project?',
      message: `Are you sure you want to remove "${title}" from the featured showcase?`,
      confirmLabel: 'Remove',
      isDanger: true,
    });
    if (!confirmed) return;

    list.splice(index, 1);
    setContent(prev => ({ ...prev, featuredProjects: list }));
    alert.info(`"${title}" removed from showcase.`);
  };

  // Service Local Handlers
  const handleAddService = () => {
    const newService: IService = {
      _id: `new-${Date.now()}`,
      title: 'New Service',
      description: 'Describe the services you offer...',
      displayOrder: services.length,
      isActive: true,
    };
    setServices(prev => [...prev, newService]);
  };

  const handleUpdateServiceLocal = (index: number, fields: Partial<IService>) => {
    const list = [...services];
    list[index] = { ...list[index], ...fields };
    setServices(list);
  };

  const moveServiceLocal = (index: number, direction: 'up' | 'down') => {
    const list = [...services];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    list.forEach((item, idx) => { item.displayOrder = idx; });
    setServices(list);
  };

  const handleDeleteServiceLocal = async (index: number) => {
    const target = services[index];
    const confirmed = await alert.confirm({
      title: 'Delete Service?',
      message: `Are you sure you want to delete service "${target.title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      isDanger: true,
    });
    if (!confirmed) return;

    if (target._id && !target._id.startsWith('new-')) {
      try {
        await deleteService(target._id);
      } catch (err: any) {
        alert.error(err.message || 'Failed to delete service', 'Delete Failed');
        return;
      }
    }
    const list = [...services];
    list.splice(index, 1);
    list.forEach((item, idx) => { item.displayOrder = idx; });
    setServices(list);
    alert.success(`Service "${target.title}" deleted successfully.`, 'Deleted');
  };

  // Social Buttons Handlers
  const handleAddSocialButton = () => {
    const currentBtns = settings.socialButtons || [];
    const newBtn: ISocialButton = {
      label: 'New Link',
      url: 'https://',
      order: currentBtns.length,
      isActive: true,
    };
    setSettings(prev => ({ ...prev, socialButtons: [...(prev.socialButtons || []), newBtn] }));
  };

  const handleUpdateSocialButton = (index: number, fields: Partial<ISocialButton>) => {
    const list = [...(settings.socialButtons || [])];
    list[index] = { ...list[index], ...fields };
    setSettings(prev => ({ ...prev, socialButtons: list }));
  };

  const moveSocialButton = (index: number, direction: 'up' | 'down') => {
    const list = [...(settings.socialButtons || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    list.forEach((item, idx) => { item.order = idx; });
    setSettings(prev => ({ ...prev, socialButtons: list }));
  };

  const removeSocialButton = async (index: number) => {
    const list = [...(settings.socialButtons || [])];
    const target = list[index];
    const confirmed = await alert.confirm({
      title: 'Remove Social Link?',
      message: `Are you sure you want to remove "${target?.label || 'this link'}" from the global footer?`,
      confirmLabel: 'Remove',
      isDanger: true,
    });
    if (!confirmed) return;

    list.splice(index, 1);
    list.forEach((item, idx) => { item.order = idx; });
    setSettings(prev => ({ ...prev, socialButtons: list }));
    alert.info(`"${target?.label || 'Link'}" removed.`);
  };

  // Per-Section Save Handler
  const handleSaveSection = async (sectionName: 'A' | 'B' | 'C' | 'D' | 'E') => {
    setErrorMsg('');
    setSuccessMsg('');

    if (sectionName === 'A' && isQuoteOverLimit) {
      alert.error(`Hero quote exceeds maximum ${MAX_HERO_QUOTE_WORDS} words limit. Please shorten the quote before saving Hero Section.`, 'Limit Exceeded');
      return;
    }

    if (sectionName === 'C' && isBioOverLimit) {
      alert.error(`Client bio exceeds maximum ${MAX_CLIENT_BIO_WORDS} words limit. Please shorten the bio before saving Section C.`, 'Limit Exceeded');
      return;
    }

    if (sectionName === 'B' && !isFeaturedValid) {
      alert.warning('Featured projects selection is invalid. Exactly 7 unique, published projects are required to save Section B.', 'Incomplete Selection');
      return;
    }

    try {
      setSavingSection(sectionName);
      const featuredIds = selectedFeaturedIds;

      if (sectionName === 'E') {
        const settingsRes = await updateSiteSettings({ ...settings });
        if (settingsRes.success) {
          alert.success('Global Footer Social Links updated successfully!', 'Saved');
        }
      } else if (sectionName === 'D') {
        // Save Home Content Services Title
        await updateHomeContent({
          ...content,
          featuredProjects: featuredIds,
        });

        // Save / Update Service Cards
        const servicePromises = services.map((srv, idx) => {
          const payload = {
            title: srv.title,
            description: srv.description,
            isActive: srv.isActive,
            displayOrder: idx,
          };
          if (srv._id && !srv._id.startsWith('new-')) {
            return updateService(srv._id, payload);
          } else {
            return createService(payload);
          }
        });

        await Promise.all(servicePromises);
        await fetchData();
        alert.success('Services Section updated successfully!', 'Saved');
      } else {
        const homeRes = await updateHomeContent({
          ...content,
          featuredProjects: featuredIds,
        });
        if (homeRes.success) {
          const names: Record<string, string> = {
            A: 'Hero Section updated successfully!',
            B: 'Featured Projects updated successfully!',
            C: 'Biography & Portrait updated successfully!',
          };
          alert.success(names[sectionName] || `Section ${sectionName} updated successfully!`, 'Saved');
        }
      }
    } catch (err: any) {
      alert.error(err.message || `Failed to save Section ${sectionName}.`, 'Save Error');
      setErrorMsg(err.message || `Failed to save Section ${sectionName}.`);
    } finally {
      setSavingSection(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Loading Home CMS Settings...
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <PageHeader title="HOME PAGE" />

      {successMsg && (
        <div style={{ padding: '0.875rem 1rem', background: '#E8F5E9', color: '#2E7D32', borderRadius: '6px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13.5px', border: '1px solid #A5D6A7' }}>
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '0.875rem 1rem', background: '#FFEBEE', color: 'var(--admin-danger)', borderRadius: '6px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13.5px', border: '1px solid #FFCDD2' }}>
          <AlertTriangle size={16} />
          {errorMsg}
        </div>
      )}

      {/* 1. HERO SECTION */}
      <AdminSection
        title="Hero Section"
        actions={
          <button
            type="button"
            onClick={() => handleSaveSection('A')}
            disabled={savingSection === 'A' || isQuoteOverLimit}
            className="admin-btn primary"
          >
            <Save size={14} />
            <span>{savingSection === 'A' ? 'Saving...' : 'Save Hero'}</span>
          </button>
        }
      >
        {isQuoteOverLimit && (
          <div style={{ padding: '0.75rem 1rem', background: '#FFEBEE', color: 'var(--admin-danger)', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #FFCDD2', fontSize: '13px', fontWeight: 500 }}>
            ⚠️ Hero Quote exceeds the maximum limit of {MAX_HERO_QUOTE_WORDS} words (Current: {quoteWordCount} words). Please shorten your quote to save Hero Section.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Traditional Hero Artwork Image Upload Card */}
          <div
            style={{
              border: '1px solid var(--admin-border-color)',
              borderRadius: '8px',
              padding: '0.875rem',
              background: 'var(--admin-bg-body)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="admin-form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Hero Artwork</label>
              {content.heroImage?.url && (
                <span style={{ fontSize: '11px', color: '#2E7D32', fontWeight: 600 }}>Active</span>
              )}
            </div>

            {content.heroImage?.url ? (
              <div>
                <div
                  style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid var(--admin-border-color)',
                    background: '#000000',
                    marginBottom: '0.625rem'
                  }}
                >
                  <img
                    src={content.heroImage.url}
                    alt="Hero Artwork"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <label
                    className="admin-btn secondary"
                    style={{
                      cursor: 'pointer',
                      flex: 1,
                      justifyContent: 'center',
                      fontSize: '12px',
                      padding: '0.4rem 0.6rem'
                    }}
                  >
                    <Upload size={13} />
                    {uploadingHero ? 'Uploading...' : 'Change Image'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleHeroImageUpload}
                      disabled={uploadingHero}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={removeHeroImage}
                    className="admin-btn-icon danger"
                    title="Remove Artwork"
                    style={{ padding: '0.4rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <label
                style={{
                  border: '2px dashed var(--admin-border-color)',
                  borderRadius: '6px',
                  padding: '1.5rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  background: '#FFFFFF',
                  transition: 'all 0.2s ease',
                }}
              >
                <Upload size={22} color="var(--admin-text-muted)" />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--admin-text-main)' }}>
                  {uploadingHero ? 'Uploading...' : 'Click to upload artwork'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                  Landscape (Min: 1600×900px | Optimal: 1920×1080px)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleHeroImageUpload}
                  disabled={uploadingHero}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {/* Hero Editorial Quote & Author */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <RichTextEditor
              value={content.heroQuote || ''}
              onChange={(val) => setContent({ ...content, heroQuote: val })}
              label="Hero Editorial Quote (Rich Text)"
              maxWords={MAX_HERO_QUOTE_WORDS}
            />

            <div style={{ maxWidth: '380px' }}>
              <label className="admin-form-label" style={{ marginBottom: '4px' }}>Hero Quote Author (Optional)</label>
              <input
                type="text"
                value={content.heroQuoteAuthor || ''}
                onChange={(e) => setContent({ ...content, heroQuoteAuthor: e.target.value })}
                className="admin-form-input"
                style={{ marginBottom: 0 }}
                placeholder="e.g. Claude Debussy"
              />
            </div>
          </div>
        </div>
      </AdminSection>

      {/* 2. FEATURED PROJECTS SHOWCASE */}
      <AdminSection
        title="Featured Projects"
        actions={
          <button
            type="button"
            onClick={() => handleSaveSection('B')}
            disabled={savingSection === 'B' || !isFeaturedValid}
            className="admin-btn primary"
          >
            <Save size={14} />
            <span>{savingSection === 'B' ? 'Saving...' : 'Save Featured'}</span>
          </button>
        }
      >

        {!isFeaturedValid && (
          <div style={{ padding: '0.875rem 1rem', background: '#FFF3E0', color: '#E65100', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #FFE0B2', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>Configuration Warning</div>
              {!validFeaturedCount && <div>• Exactly 7 featured projects must be selected (currently {selectedFeaturedIds.length} selected).</div>}
              {hasDuplicateFeatured && <div>• Selection contains duplicate project entries.</div>}
              {invalidProjectItems.length > 0 && (
                <div>
                  • Selected projects contain unpublished/deleted projects: {invalidProjectItems.map(item => (item ? (item.title || item.id) : '')).filter(Boolean).join(', ')}. Please remove or replace them.
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '1.25rem', maxWidth: '420px' }}>
          <label className="admin-form-label" style={{ marginBottom: '4px' }}>Featured Section Title</label>
          <input
            type="text"
            value={content.introTitle || ''}
            onChange={(e) => setContent({ ...content, introTitle: e.target.value })}
            className="admin-form-input"
            style={{ marginBottom: 0 }}
            placeholder="e.g. Some Projects I’ve Worked on"
          />
        </div>

        {/* Current 7 Featured Projects Order List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {selectedFeaturedIds.map((projId, idx) => {
            const projObj = availableProjects.find(p => p._id === projId);
            const isInvalid = !projObj || !projObj.published;
            const title = projObj ? projObj.title : `Missing/Deleted Project (${projId})`;

            return (
              <div
                key={`${projId}-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: isInvalid ? '#FFEBEE' : 'var(--admin-bg-body)',
                  border: isInvalid ? '1px solid #FFCDD2' : '1px solid var(--admin-border-color)',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-muted)', width: '20px' }}>
                    {idx + 1}.
                  </span>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: isInvalid ? 'var(--admin-danger)' : 'var(--admin-text-main)' }}>
                      {title}
                    </span>
                    {projObj && (
                      <span style={{ marginLeft: '0.75rem' }}>
                        <StatusBadge status={projObj.published ? 'published' : 'draft'} />
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => moveFeatured(idx, 'up')}
                    disabled={idx === 0}
                    className="admin-btn-icon"
                    title="Move Up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFeatured(idx, 'down')}
                    disabled={idx === selectedFeaturedIds.length - 1}
                    className="admin-btn-icon"
                    title="Move Down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFeatured(idx)}
                    className="admin-btn-icon danger"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <label className="admin-form-label">Available Published Projects (Click to toggle selection)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {availableProjects.map((p) => {
            const isSelected = selectedFeaturedIds.includes(p._id);
            const isPub = p.published;

            return (
              <button
                key={p._id}
                type="button"
                onClick={() => toggleFeaturedProject(p._id)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid #111111' : '1px solid var(--admin-border-color)',
                  background: isSelected ? '#111111' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : 'inherit',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: isPub ? 1 : 0.6,
                  transition: 'all 0.2s ease',
                }}
              >
                {isSelected ? '✓ ' : '+ '}
                {p.title} {!isPub && '(Unpublished)'}
              </button>
            );
          })}
        </div>
      </AdminSection>

      {/* 3. HOME BIO & CLIENT PORTRAIT */}
      {/* 3. HOME BIO & CLIENT PORTRAIT */}
      <AdminSection
        title="Biography & Portrait"
        actions={
          <button
            type="button"
            onClick={() => handleSaveSection('C')}
            disabled={savingSection === 'C' || isBioOverLimit}
            className="admin-btn primary"
          >
            <Save size={14} />
            <span>{savingSection === 'C' ? 'Saving...' : 'Save Bio'}</span>
          </button>
        }
      >
        {isBioOverLimit && (
          <div style={{ padding: '0.75rem 1rem', background: '#FFEBEE', color: 'var(--admin-danger)', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #FFCDD2', fontSize: '13px', fontWeight: 500 }}>
            ⚠️ Client Bio exceeds the maximum limit of {MAX_CLIENT_BIO_WORDS} words (Current: {bioWordCount} words). Please shorten your bio text to save Section C.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(240px, 280px)', gap: '1.25rem', alignItems: 'start' }}>
          <div>
            <RichTextEditor
              value={content.introText || ''}
              onChange={(val) => setContent({ ...content, introText: val })}
              label="Biography / Intro Text (Rich Text)"
              maxWords={MAX_CLIENT_BIO_WORDS}
            />
          </div>

          {/* Traditional Client Portrait Image Upload Card */}
          <div
            style={{
              border: '1px solid var(--admin-border-color)',
              borderRadius: '8px',
              padding: '0.875rem',
              background: 'var(--admin-bg-body)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="admin-form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Portrait Photo</label>
              {content.introImage?.url && (
                <span style={{ fontSize: '11px', color: '#2E7D32', fontWeight: 600 }}>Active</span>
              )}
            </div>

            {content.introImage?.url ? (
              <div>
                <div
                  style={{
                    width: '100%',
                    height: '190px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid var(--admin-border-color)',
                    background: '#F0F0EE',
                    marginBottom: '0.625rem'
                  }}
                >
                  <img
                    src={content.introImage.url}
                    alt="Client Portrait"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <label
                    className="admin-btn secondary"
                    style={{
                      cursor: 'pointer',
                      flex: 1,
                      justifyContent: 'center',
                      fontSize: '12px',
                      padding: '0.4rem 0.6rem'
                    }}
                  >
                    <Upload size={13} />
                    {uploadingIntro ? 'Uploading...' : 'Change Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleIntroImageUpload}
                      disabled={uploadingIntro}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={removeIntroImage}
                    className="admin-btn-icon danger"
                    title="Remove Image"
                    style={{ padding: '0.4rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <label
                style={{
                  border: '2px dashed var(--admin-border-color)',
                  borderRadius: '6px',
                  padding: '1.75rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  background: '#FFFFFF',
                  transition: 'all 0.2s ease',
                }}
              >
                <Upload size={22} color="var(--admin-text-muted)" />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--admin-text-main)' }}>
                  {uploadingIntro ? 'Uploading...' : 'Click to upload portrait'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                  Portrait 3:4 (Min: 500×600px | Optimal: 600×800px)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleIntroImageUpload}
                  disabled={uploadingIntro}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
        </div>
      </AdminSection>

      {/* 4. SERVICES SECTION */}
      <AdminSection
        title="Services Section"
        actions={
          <button
            type="button"
            onClick={() => handleSaveSection('D')}
            disabled={savingSection === 'D'}
            className="admin-btn primary"
          >
            <Save size={14} />
            <span>{savingSection === 'D' ? 'Saving...' : 'Save Services'}</span>
          </button>
        }
      >
        <div style={{ marginBottom: '1.25rem', maxWidth: '420px' }}>
          <label className="admin-form-label" style={{ marginBottom: '4px' }}>Services Section Title</label>
          <input
            type="text"
            value={content.servicesSectionTitle || ''}
            onChange={(e) => setContent({ ...content, servicesSectionTitle: e.target.value })}
            className="admin-form-input"
            style={{ marginBottom: 0 }}
            placeholder="e.g. Services I offer:"
          />
        </div>

        {/* 3 Service Cards Arranged Horizontally */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {services.slice(0, 3).map((srv, idx) => (
            <div
              key={srv._id || idx}
              style={{
                background: 'var(--admin-bg-body)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--admin-border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)' }}>
                  Service 0{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateServiceLocal(idx, { isActive: !srv.isActive })}
                  className="admin-btn secondary"
                  style={{ fontSize: '11px', padding: '0.25rem 0.5rem' }}
                  title="Toggle visibility"
                >
                  {srv.isActive ? <Eye size={13} color="#2E7D32" /> : <EyeOff size={13} color="var(--admin-text-muted)" />}
                  {srv.isActive ? 'Active' : 'Hidden'}
                </button>
              </div>

              <div>
                <label className="admin-form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Title *</label>
                <input
                  type="text"
                  value={srv.title || ''}
                  onChange={(e) => handleUpdateServiceLocal(idx, { title: e.target.value })}
                  className="admin-form-input"
                  style={{ marginBottom: 0 }}
                  placeholder={`Service 0${idx + 1} Title`}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <label className="admin-form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Description *</label>
                <textarea
                  value={srv.description || ''}
                  onChange={(e) => handleUpdateServiceLocal(idx, { description: e.target.value })}
                  className="admin-form-textarea"
                  style={{ marginBottom: 0, resize: 'vertical', minHeight: '80px', flex: 1 }}
                  rows={3}
                  placeholder="Service description paragraph..."
                  required
                />
              </div>
            </div>
          ))}
        </div>
      </AdminSection>

      {/* SECTION E: SOCIAL & CONTACT LINKS (GLOBAL FOOTER CONTENT) */}
      {/* 5. SOCIAL LINKS */}
      <AdminSection
        title="Social & Contact Links"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleAddSocialButton}
              className="admin-btn secondary"
              style={{ fontSize: '12.5px' }}
            >
              <Plus size={14} /> Add Link
            </button>
            <button
              type="button"
              onClick={() => handleSaveSection('E')}
              disabled={savingSection === 'E'}
              className="admin-btn primary"
            >
              <Save size={14} />
              <span>{savingSection === 'E' ? 'Saving...' : 'Save Links'}</span>
            </button>
          </div>
        }
      >

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(settings.socialButtons || []).map((btn, idx) => (
            <div
              key={btn._id || idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr 100px 110px',
                gap: '0.75rem',
                alignItems: 'center',
                background: 'var(--admin-bg-body)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--admin-border-color)',
              }}
            >
              <input
                type="text"
                value={btn.label}
                onChange={(e) => handleUpdateSocialButton(idx, { label: e.target.value })}
                placeholder="Label (e.g. Instagram)"
                className="admin-form-input"
                style={{ marginBottom: 0 }}
                required
              />
              <input
                type="text"
                value={btn.url}
                onChange={(e) => handleUpdateSocialButton(idx, { url: e.target.value })}
                placeholder="URL (e.g. https://... or mailto:...)"
                className="admin-form-input"
                style={{ marginBottom: 0 }}
                required
              />
              <button
                type="button"
                onClick={() => handleUpdateSocialButton(idx, { isActive: !btn.isActive })}
                className="admin-btn secondary"
                style={{ fontSize: '12px', padding: '0.4rem 0.6rem', justifyContent: 'center' }}
              >
                {btn.isActive ? <Eye size={14} color="#2E7D32" /> : <EyeOff size={14} color="var(--admin-text-muted)" />}
                {btn.isActive ? 'Active' : 'Hidden'}
              </button>

              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => moveSocialButton(idx, 'up')}
                  disabled={idx === 0}
                  className="admin-btn-icon"
                  title="Move Up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveSocialButton(idx, 'down')}
                  disabled={idx === (settings.socialButtons || []).length - 1}
                  className="admin-btn-icon"
                  title="Move Down"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => removeSocialButton(idx)}
                  className="admin-btn-icon danger"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </AdminSection>
    </div>
  );
};
