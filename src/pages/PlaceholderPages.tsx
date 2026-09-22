import React from 'react';
import { FolderKanban, Layers, Wrench, User, MessageSquare, Settings } from 'lucide-react';

const PageWrapper: React.FC<{ title: string; description: string; icon: React.ElementType }> = ({
  title,
  description,
  icon: Icon,
}) => (
  <div style={{ padding: '1rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
      <Icon size={24} />
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>{title}</h1>
    </div>
    <p style={{ color: 'var(--admin-text-muted)', marginBottom: '2rem' }}>{description}</p>

    <div className="admin-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        {title} Management Ready for Phase 03 & 04
      </div>
      <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', maxWidth: '480px', margin: '0 auto' }}>
        This content management section will be connected to the MongoDB Atlas CRUD APIs and Cloudinary upload manager in the upcoming implementation phases.
      </p>
    </div>
  </div>
);


export const CategoriesPage: React.FC = () => (
  <PageWrapper
    title="Categories Management"
    description="Manage project classification tags and filter criteria."
    icon={Layers}
  />
);

export const ServicesPage: React.FC = () => (
  <PageWrapper
    title="Services Management"
    description="Update offered design disciplines, consulting services, and expertise listings."
    icon={Wrench}
  />
);

export const ProfilePage: React.FC = () => (
  <PageWrapper
    title="Profile & Bio Management"
    description="Edit main biography, headshot photo URL, resume download link, and social channels."
    icon={User}
  />
);

export const MessagesPage: React.FC = () => (
  <PageWrapper
    title="Client Messages & Inquiries"
    description="View and respond to incoming contact submissions from the public portfolio site."
    icon={MessageSquare}
  />
);

export const SettingsPage: React.FC = () => (
  <PageWrapper
    title="CMS Site Settings"
    description="Configure global metadata, SEO defaults, contact email alerts, and security settings."
    icon={Settings}
  />
);
