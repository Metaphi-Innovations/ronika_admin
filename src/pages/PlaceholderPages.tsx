import React from 'react';
import { Layers, Wrench, User, MessageSquare, Settings } from 'lucide-react';
import { AdminSection, PageHeader } from '../components/AdminSection';

const PageWrapper: React.FC<{ title: string; subtitle: string; icon: React.ElementType; emptyTitle: string; emptyDesc: string }> = ({
  title,
  subtitle,
  icon: Icon,
  emptyTitle,
  emptyDesc,
}) => (
  <div>
    <PageHeader title={title} subtitle={subtitle} />

    <AdminSection>
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
        <Icon size={36} color="var(--admin-border-color)" style={{ marginBottom: '0.75rem' }} />
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '0.25rem' }}>
          {emptyTitle}
        </h3>
        <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', maxWidth: '440px', margin: '0 auto' }}>
          {emptyDesc}
        </p>
      </div>
    </AdminSection>
  </div>
);

export const CategoriesPage: React.FC = () => (
  <PageWrapper
    title="Categories"
    subtitle="Project classification tags"
    icon={Layers}
    emptyTitle="No categories yet"
    emptyDesc="Add categories to organize portfolio projects."
  />
);

export const ServicesPage: React.FC = () => (
  <PageWrapper
    title="Services"
    subtitle="Design disciplines and services"
    icon={Wrench}
    emptyTitle="No services yet"
    emptyDesc="Add services to showcase your offerings."
  />
);

export const ProfilePage: React.FC = () => (
  <PageWrapper
    title="Profile"
    subtitle="Biography and credentials"
    icon={User}
    emptyTitle="Profile Information"
    emptyDesc="Manage your bio and details in About & Bio."
  />
);

export const MessagesPage: React.FC = () => (
  <PageWrapper
    title="Messages"
    subtitle="Client inquiries and contact form submissions"
    icon={MessageSquare}
    emptyTitle="No messages yet"
    emptyDesc="Inquiries submitted through your portfolio contact form will appear here."
  />
);

export const SettingsPage: React.FC = () => (
  <PageWrapper
    title="Settings"
    subtitle="Site preferences and SEO defaults"
    icon={Settings}
    emptyTitle="Site Configuration"
    emptyDesc="Configure global metadata and preferences."
  />
);
