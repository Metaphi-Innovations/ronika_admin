import React, { useState, useEffect } from 'react';
import { Save, Instagram, Linkedin, Mail } from 'lucide-react';
import { getContactContent, updateContactContent, IContactContent } from '../services/contentApi';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { useAlert } from '../context/AlertContext';
import { useLiveResource } from '../context/LiveSyncContext';

export const ContactPageEditor: React.FC = () => {
  const alert = useAlert();
  const [content, setContent] = useState<Partial<IContactContent>>({
    heading: '',
    description: '',
    email: '',
    phone: '',
    location: '',
    socialLinks: { instagram: '', linkedin: '', behance: '', pinterest: '' },
    ctaText: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchContent = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await getContactContent();
      if (res.success && res.data) {
        setContent(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent(true);
  }, []);

  // Live CMS Synchronization: background reload without page blanking
  useLiveResource(['contact'], () => {
    fetchContent(false);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.heading?.trim()) {
      alert.warning('Please enter a contact heading.', 'Validation Error');
      return;
    }
    if (!content.email?.trim()) {
      alert.warning('Please enter a Gmail / contact email address.', 'Validation Error');
      return;
    }

    try {
      setSaving(true);
      const { _id, __v, createdAt, updatedAt, ...cleanContent } = content as any;
      const res = await updateContactContent(cleanContent);
      if (res.success) {
        alert.success('Contact details saved successfully!', 'Saved');
      }
    } catch (err: any) {
      alert.error(err.response?.data?.message || err.message || 'Failed to save contact settings', 'Save Error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-container">
        <PageHeader title="CONTACT DETAILS" />
        <div style={{ padding: '4rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div className="spinner" style={{ width: '28px', height: '28px' }}></div>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--admin-text-muted, #777)' }}>
            Loading Contact Settings...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <form onSubmit={handleSubmit}>
        <PageHeader
          title="CONTACT DETAILS"
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* 1. Contact Information */}
          <AdminSection title="CONTACT INFORMATION">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1rem',
                alignItems: 'start',
              }}
            >
              <div className="admin-form-group" style={{ margin: 0 }}>
                <label className="admin-form-label">Heading *</label>
                <input
                  type="text"
                  value={content.heading || ''}
                  onChange={(e) => setContent({ ...content, heading: e.target.value })}
                  className="admin-form-input"
                  placeholder="e.g. LET'S CREATE TOGETHER"
                  required
                />
              </div>

              <div className="admin-form-group" style={{ margin: 0 }}>
                <label className="admin-form-label">Introductory Description</label>
                <textarea
                  value={content.description || ''}
                  onChange={(e) => setContent({ ...content, description: e.target.value })}
                  className="admin-form-textarea"
                  rows={2}
                  placeholder="e.g. Open for brand identity commissions, publication design, and visual consultations."
                />
              </div>
            </div>
          </AdminSection>

          {/* 2. Connected Links (Instagram, LinkedIn, Gmail) */}
          <AdminSection title="CONTACT & SOCIAL LINKS">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1rem',
              }}
            >
              {/* Instagram */}
              <div className="admin-form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem' }}>
                  <Instagram size={15} style={{ color: 'var(--admin-text-main)' }} />
                  <label className="admin-form-label" style={{ margin: 0, fontWeight: 600 }}>INSTAGRAM URL</label>
                </div>
                <input
                  type="url"
                  value={content.socialLinks?.instagram || ''}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      socialLinks: { ...content.socialLinks, instagram: e.target.value },
                    })
                  }
                  className="admin-form-input"
                  placeholder="https://instagram.com/ronika_bhatia"
                />
              </div>

              {/* LinkedIn */}
              <div className="admin-form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem' }}>
                  <Linkedin size={15} style={{ color: 'var(--admin-text-main)' }} />
                  <label className="admin-form-label" style={{ margin: 0, fontWeight: 600 }}>LINKEDIN URL</label>
                </div>
                <input
                  type="url"
                  value={content.socialLinks?.linkedin || ''}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      socialLinks: { ...content.socialLinks, linkedin: e.target.value },
                    })
                  }
                  className="admin-form-input"
                  placeholder="https://linkedin.com/in/ronikabhatia"
                />
              </div>

              {/* Gmail / Contact Email */}
              <div className="admin-form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem' }}>
                  <Mail size={15} style={{ color: 'var(--admin-text-main)' }} />
                  <label className="admin-form-label" style={{ margin: 0, fontWeight: 600 }}>GMAIL ADDRESS *</label>
                </div>
                <input
                  type="email"
                  value={content.email || ''}
                  onChange={(e) => setContent({ ...content, email: e.target.value })}
                  className="admin-form-input"
                  placeholder="ronikabhatia@gmail.com"
                  required
                />
              </div>
            </div>

            {/* Live Preview Bar matching the frontend display */}
            <div
              style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--admin-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--admin-text-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Public Contact Page Preview
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2.5rem',
                  padding: '1rem 1.5rem',
                  backgroundColor: 'var(--admin-card-bg)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: '6px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '13px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: content.socialLinks?.instagram ? 'var(--admin-text-main)' : 'var(--admin-text-muted)',
                  }}
                >
                  <Instagram size={17} /> INSTAGRAM
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '13px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: content.socialLinks?.linkedin ? 'var(--admin-text-main)' : 'var(--admin-text-muted)',
                  }}
                >
                  <Linkedin size={17} /> LINKEDIN
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '13px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: content.email ? 'var(--admin-text-main)' : 'var(--admin-text-muted)',
                  }}
                >
                  <Mail size={17} /> GMAIL
                </div>
              </div>
            </div>
          </AdminSection>
        </div>
      </form>
    </div>
  );
};

