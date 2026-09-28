import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FolderKanban,
  ShoppingBag,
  MessageSquare,
  Plus,
  ArrowRight,
  Edit2,
  Image as ImageIcon,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getProjects, IProject } from '../services/projectApi';
import { getGalleryCategories } from '../services/galleryApi';
import { getShopProducts } from '../services/shopApi';
import { getEnquiries, IEnquiry } from '../services/enquiryApi';
import { StatusBadge } from '../components/StatusBadge';
import { AdminSection, PageHeader } from '../components/AdminSection';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState({
    projects: 0,
    categories: 0,
    shopProducts: 0,
    enquiries: 0,
    unreadEnquiries: 0,
  });
  const [recentProjects, setRecentProjects] = useState<IProject[]>([]);
  const [recentEnquiries, setRecentEnquiries] = useState<IEnquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        const [projRes, galRes, shopRes, enqRes] = await Promise.allSettled([
          getProjects(),
          getGalleryCategories(),
          getShopProducts(),
          getEnquiries(),
        ]);

        const projectList = projRes.status === 'fulfilled' && projRes.value?.success ? projRes.value.data : [];
        const categoryCount = galRes.status === 'fulfilled' && galRes.value?.success ? galRes.value.data.length : 0;
        const shopCount = shopRes.status === 'fulfilled' && shopRes.value?.success ? shopRes.value.data.length : 0;
        const enquiryList: IEnquiry[] = enqRes.status === 'fulfilled' && enqRes.value?.success ? enqRes.value.data : [];

        const unreadCount = enquiryList.filter((e) => !e.isRead).length;

        setCounts({
          projects: projectList.length,
          categories: categoryCount,
          shopProducts: shopCount,
          enquiries: enquiryList.length,
          unreadEnquiries: unreadCount,
        });

        setRecentProjects(projectList.slice(0, 5));
        setRecentEnquiries(enquiryList.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateString;
    }
  };

  const stats = [
    { label: 'Portfolio Projects', value: loading ? '—' : counts.projects, path: '/projects', icon: FolderKanban },
    { label: 'Artwork Gallery', value: loading ? '—' : counts.categories, path: '/gallery', icon: ImageIcon },
    { label: 'Shop Products', value: loading ? '—' : counts.shopProducts, path: '/shop', icon: ShoppingBag },
    {
      label: 'Client Messages',
      value: loading ? '—' : counts.enquiries,
      path: '/messages',
      icon: MessageSquare,
      badge: counts.unreadEnquiries > 0 ? `${counts.unreadEnquiries} new` : undefined,
    },
  ];

  return (
    <div className="dashboard-content-wrapper">
      <PageHeader
        title="DASHBOARD"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link to="/messages" className="admin-btn secondary">
              <MessageSquare size={14} />
              <span>
                Messages {counts.unreadEnquiries > 0 && `(${counts.unreadEnquiries})`}
              </span>
            </Link>
            <Link to="/projects/new" className="admin-btn primary">
              <Plus size={15} />
              <span>New Project</span>
            </Link>
          </div>
        }
      />

      {/* Metrics Row */}
      <div
        className="stat-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '0.875rem',
          marginBottom: '1.25rem',
        }}
      >
        {stats.map((stat, idx) => {
          const IconComp = stat.icon;
          return (
            <Link
              key={idx}
              to={stat.path}
              className="admin-card"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.875rem 1rem',
                transition: 'border-color 0.2s ease, transform 0.2s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--admin-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {stat.label}
                  </span>
                  {stat.badge && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        padding: '1px 6px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {stat.badge}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--admin-text-main)',
                    marginTop: '4px',
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
              </div>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '6px',
                  backgroundColor: '#FAFAF8',
                  border: '1px solid var(--admin-border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--admin-text-muted)',
                }}
              >
                <IconComp size={16} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Portfolio Projects Section */}
      <AdminSection
        title="RECENT PROJECTS"
        noPadding
        actions={
          <Link
            to="/projects"
            style={{
              fontSize: '12.5px',
              fontWeight: 500,
              color: 'var(--admin-text-muted)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>View all</span>
            <ArrowRight size={13} />
          </Link>
        }
      >
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px' }}>
            Loading projects...
          </div>
        ) : recentProjects.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '13.5px', margin: '0 0 1rem 0' }}>
              No portfolio projects created yet.
            </p>
            <Link to="/projects/new" className="admin-btn primary">
              <Plus size={14} />
              <span>Create First Project</span>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="admin-data-grid">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Category</th>
                  <th>Images</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map((project) => (
                  <tr key={project._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {project.heroImage?.url ? (
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              backgroundColor: '#FAFAF8',
                              border: '1px solid var(--admin-border-color)',
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src={project.heroImage.url}
                              alt={project.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ) : (
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '4px',
                              backgroundColor: '#FAFAF8',
                              border: '1px solid var(--admin-border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <ImageIcon size={15} color="var(--admin-text-light)" />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--admin-text-main)' }}>
                            {project.title}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--admin-text-muted)', fontFamily: 'var(--admin-font-accent)' }}>
                            /{project.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      {project.category && typeof project.category === 'object' && project.category.name ? (
                        <span style={{ color: 'var(--admin-text-main)' }}>{project.category.name}</span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#D84315', background: '#FBE9E7', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '12.5px', color: 'var(--admin-text-muted)' }}>
                      {project.images?.length || 0}
                    </td>
                    <td>
                      <StatusBadge status={project.published ? 'published' : 'draft'} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/projects/${project._id}`}
                        className="admin-btn-icon"
                        title="Edit Project"
                        style={{ display: 'inline-flex' }}
                      >
                        <Edit2 size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      {/* Recent Client Enquiries Section */}
      <AdminSection
        title="RECENT CLIENT ENQUIRIES"
        noPadding
        actions={
          <Link
            to="/messages"
            style={{
              fontSize: '12.5px',
              fontWeight: 500,
              color: 'var(--admin-text-muted)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>View all</span>
            <ArrowRight size={13} />
          </Link>
        }
      >
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px' }}>
            Loading enquiries...
          </div>
        ) : recentEnquiries.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '13.5px', margin: '0 0 1rem 0' }}>
              No client enquiries received yet.
            </p>
            <Link to="/shop" className="admin-btn secondary">
              <ShoppingBag size={14} />
              <span>Browse Shop Products</span>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="admin-data-grid">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Product / Subject</th>
                  <th>Received</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentEnquiries.map((enquiry) => (
                  <tr key={enquiry._id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--admin-text-main)' }}>
                          {enquiry.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                          {enquiry.email}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', fontWeight: 500, color: 'var(--admin-text-main)' }}>
                      {enquiry.productName || 'General Enquiry'}
                    </td>
                    <td style={{ fontSize: '12.5px', color: 'var(--admin-text-muted)' }}>
                      {formatDate(enquiry.createdAt)}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: enquiry.isRead ? '#F3F4F6' : '#FEF3C7',
                          color: enquiry.isRead ? '#4B5563' : '#92400E',
                          textTransform: 'uppercase',
                        }}
                      >
                        {enquiry.isRead ? 'Read' : 'New'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to="/messages"
                        className="admin-btn-icon"
                        title="View Enquiry"
                        style={{ display: 'inline-flex' }}
                      >
                        <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </div>
  );
};

export default DashboardPage;
