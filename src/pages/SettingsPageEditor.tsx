import React, { useState, useEffect } from 'react';
import { Save, CheckCircle } from 'lucide-react';
import { getSiteSettings, updateSiteSettings, ISiteSettings } from '../services/contentApi';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { useAlert } from '../context/AlertContext';

export const SettingsPageEditor: React.FC = () => {
  const alert = useAlert();
  const [settings, setSettings] = useState<Partial<ISiteSettings>>({
    siteTitle: '',
    metaDescription: '',
    contactEmail: '',
    footerText: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await getSiteSettings();
        if (res.success && res.data) {
          setSettings(res.data);
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { _id, __v, createdAt, updatedAt, ...cleanSettings } = settings as any;
      const res = await updateSiteSettings(cleanSettings);
      if (res.success) {
        alert.success('Global site settings saved successfully!', 'Saved');
      }
    } catch (err: any) {
      alert.error(err.response?.data?.message || err.message || 'Failed to save site settings', 'Save Error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading Site Settings...</div>;
  }

  return (
    <div className="admin-page-container">
      <PageHeader
        title="Settings"
        subtitle="Global website preferences, metadata, and SEO configuration."
      />

      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#E8F5E9', color: '#2E7D32', borderRadius: '6px', marginBottom: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13px', border: '1px solid #A5D6A7' }}>
          <CheckCircle size={15} />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <AdminSection
          title="SEO & General"
          subtitle="Site title, notification recipient, and global meta description"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="admin-label">Website Title *</label>
              <input
                type="text"
                value={settings.siteTitle || ''}
                onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
                className="admin-input"
                required
              />
            </div>

            <div>
              <label className="admin-label">Notification Email *</label>
              <input
                type="email"
                value={settings.contactEmail || ''}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                className="admin-input"
                required
              />
            </div>
          </div>

          <div>
            <label className="admin-label">Meta Description</label>
            <textarea
              value={settings.metaDescription || ''}
              onChange={(e) => setSettings({ ...settings, metaDescription: e.target.value })}
              className="admin-textarea"
              rows={3}
            />
          </div>
        </AdminSection>

        <AdminSection
          title="Footer"
          subtitle="Copyright and legal disclaimer shown across all website footers"
        >
          <div>
            <label className="admin-label">Footer Copyright Notice</label>
            <input
              type="text"
              value={settings.footerText || ''}
              onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
              className="admin-input"
              style={{ maxWidth: '500px' }}
            />
          </div>
        </AdminSection>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button
            type="submit"
            className="admin-btn primary"
            disabled={saving}
            style={{ fontSize: '13.5px', padding: '0.6rem 1.5rem' }}
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
