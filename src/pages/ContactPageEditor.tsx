import React, { useState, useEffect } from 'react';
import { Save, Instagram, Linkedin, Mail } from 'lucide-react';
import { getContactContent, updateContactContent, IContactContent } from '../services/contentApi';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { Loader } from '../components/Loader';
import { useAlert } from '../context/AlertContext';
import { useLiveResource } from '../context/LiveSyncContext';
import { useValidation } from '../hooks/useValidation';
import { InlineError } from '../components/InlineError';

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
  const { errors, validate, clearError } = useValidation<'heading'>();

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
    
    const isValid = validate({
      heading: () => !content.heading?.trim() ? 'Please enter a contact heading.' : null,
    });
    
    if (!isValid) return;


    try {
      setSaving(true);
      const { _id, __v, createdAt, updatedAt, ...cleanContent } = content as any;
      const res = await updateContactContent(cleanContent);
      if (res.success) {
        alert.success('Contact details saved.');
      }
    } catch (err: any) {
      alert.error(err.message || "We couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-container">
        <Loader text="Loading Contact Settings..." />
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="admin-form-label" htmlFor="field-heading" style={{ margin: 0 }}>
                    Heading <span className="admin-required-asterisk">*</span>
                  </label>
                  <span
                    style={{
                      fontSize: '10.5px',
                      color: (content.heading?.length || 0) >= 25 ? 'var(--admin-danger)' : 'var(--admin-text-muted)',
                      fontWeight: (content.heading?.length || 0) >= 25 ? 600 : 400
                    }}
                  >
                    {content.heading?.length || 0} / 25 characters
                  </span>
                </div>
                <input
                  id="field-heading"
                  type="text"
                  maxLength={25}
                  value={content.heading || ''}
                  onChange={(e) => {
                    setContent({ ...content, heading: e.target.value });
                    clearError('heading');
                  }}
                  className={`admin-form-input ${errors.heading ? 'has-error' : ''}`}
                  placeholder="e.g. LET'S CREATE TOGETHER"
                  aria-invalid={!!errors.heading}
                  aria-describedby={errors.heading ? 'error-heading' : undefined}
                />
                <InlineError id="error-heading" error={errors.heading} />
              </div>

              <div className="admin-form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="admin-form-label" style={{ margin: 0 }}>Introductory Description</label>
                  <span
                    style={{
                      fontSize: '10.5px',
                      color: (content.description?.length || 0) >= 300 ? 'var(--admin-danger)' : 'var(--admin-text-muted)',
                      fontWeight: (content.description?.length || 0) >= 300 ? 600 : 400
                    }}
                  >
                    {content.description?.length || 0} / 300 characters
                  </span>
                </div>
                <textarea
                  value={content.description || ''}
                  maxLength={300}
                  onChange={(e) => setContent({ ...content, description: e.target.value })}
                  className="admin-form-textarea"
                  rows={2}
                  placeholder="e.g. Open for brand identity commissions, publication design, and visual consultations."
                />
              </div>
            </div>
          </AdminSection>


        </div>
      </form>
    </div>
  );
};

