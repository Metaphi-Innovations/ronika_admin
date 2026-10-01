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
  Eye,
  Clock,
  Copy,
  Reply,
  ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getProjects, IProject } from '../services/projectApi';
import { getGalleryCategories } from '../services/galleryApi';
import { getShopProducts } from '../services/shopApi';
import { getEnquiries, toggleEnquiryRead, IEnquiry } from '../services/enquiryApi';
import { StatusBadge } from '../components/StatusBadge';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { getImageUrl } from '../utils/imageUrl';
import { useAlert } from '../context/AlertContext';
import { useLiveResource } from '../context/LiveSyncContext';
import {
  getGmailComposeUrl,
  getMailtoUrl,
  buildEnquiryReplyDraft,
} from '../utils/mail';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const alert = useAlert();
  const [counts, setCounts] = useState({
    projects: 0,
    categories: 0,
    shopProducts: 0,
    enquiries: 0,
    unreadEnquiries: 0,
  });
  const [recentProjects, setRecentProjects] = useState<IProject[]>([]);
  const [recentEnquiries, setRecentEnquiries] = useState<IEnquiry[]>([]);
  const [selectedEnquiry, setSelectedEnquiry] = useState<IEnquiry | null>(null);
  const [replyMenuOpen, setReplyMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert.success(`${label} copied to clipboard!`, 'Copied');
    } catch {
      alert.error('Failed to copy to clipboard', 'Error');
    }
  };

  const handleOpenEnquiry = async (enquiry: IEnquiry) => {
    setSelectedEnquiry(enquiry);
    setReplyMenuOpen(false);
    if (!enquiry.isRead) {
      try {
        const res = await toggleEnquiryRead(enquiry._id, true);
        if (res.success) {
          setRecentEnquiries((prev) =>
            prev.map((e) => (e._id === enquiry._id ? { ...e, isRead: true } : e))
          );
          setCounts((prev) => ({
            ...prev,
            unreadEnquiries: Math.max(0, prev.unreadEnquiries - 1),
          }));
          setSelectedEnquiry((prev) => (prev ? { ...prev, isRead: true } : null));
        }
      } catch (err: any) {
        console.error('Failed to mark enquiry as read:', err);
      }
    }
  };

  const handleToggleReadStatus = async (enquiry: IEnquiry) => {
    try {
      const nextState = !enquiry.isRead;
      const res = await toggleEnquiryRead(enquiry._id, nextState);
      if (res.success) {
        setRecentEnquiries((prev) =>
          prev.map((e) => (e._id === enquiry._id ? { ...e, isRead: nextState } : e))
        );
        setCounts((prev) => ({
          ...prev,
          unreadEnquiries: nextState
            ? Math.max(0, prev.unreadEnquiries - 1)
            : prev.unreadEnquiries + 1,
        }));
        setSelectedEnquiry((prev) => (prev ? { ...prev, isRead: nextState } : null));
        alert.success(`Marked enquiry as ${nextState ? 'read' : 'unread'}.`);
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to update message status', 'Error');
    }
  };

  const loadMetrics = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
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
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics(true);
  }, []);

  // Live CMS Synchronization for Dashboard
  useLiveResource(['projects', 'gallery', 'shop', 'enquiries'], () => {
    loadMetrics(false);
  });

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
                              src={getImageUrl(project.heroImage.url)}
                              alt={project.title}
                              loading="lazy"
                              decoding="async"
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
                      <button
                        type="button"
                        onClick={() => handleOpenEnquiry(enquiry)}
                        className="admin-btn-icon"
                        title="View Enquiry Details"
                        style={{ display: 'inline-flex', cursor: 'pointer' }}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      {/* In-place Client Enquiry View Modal */}
      {selectedEnquiry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="admin-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(94vw, 540px)',
              padding: '1.25rem',
              maxHeight: '90dvh',
              overflowY: 'auto',
              background: '#ffffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--admin-border-color)',
                paddingBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>CLIENT ENQUIRY</h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: selectedEnquiry.isRead ? '#F3F4F6' : '#FEF3C7',
                    color: selectedEnquiry.isRead ? '#4B5563' : '#92400E',
                    textTransform: 'uppercase',
                  }}
                >
                  {selectedEnquiry.isRead ? 'Read' : 'New'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedEnquiry(null);
                  setReplyMenuOpen(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'var(--admin-text-muted)',
                }}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label className="admin-label" style={{ fontSize: '11px' }}>
                  Product Enquired
                </label>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--admin-text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ShoppingBag size={15} /> {selectedEnquiry.productName || 'General Enquiry'}
                </div>
              </div>

              <div className="admin-two-col-grid" style={{ gap: '0.875rem' }}>
                <div>
                  <label className="admin-label" style={{ fontSize: '11px' }}>
                    Client Name
                  </label>
                  <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--admin-text-main)' }}>
                    {selectedEnquiry.name}
                  </div>
                </div>

                <div>
                  <label className="admin-label" style={{ fontSize: '11px' }}>
                    Received Date
                  </label>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--admin-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Clock size={13} />
                    {new Date(selectedEnquiry.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="admin-two-col-grid" style={{ gap: '0.875rem' }}>
                <div>
                  <label className="admin-label" style={{ fontSize: '11px' }}>
                    Email Address
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <a
                      href={getGmailComposeUrl({
                        to: selectedEnquiry.email,
                        ...buildEnquiryReplyDraft(selectedEnquiry),
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '13px', color: '#1E88E5', textDecoration: 'underline' }}
                      title="Click to compose reply in Gmail"
                    >
                      {selectedEnquiry.email}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedEnquiry.email, 'Email address')}
                      className="admin-btn-icon"
                      style={{ width: '22px', height: '22px', padding: 0 }}
                      title="Copy email address"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="admin-label" style={{ fontSize: '11px' }}>
                    Phone / WhatsApp
                  </label>
                  <div style={{ fontSize: '13px', color: 'var(--admin-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{selectedEnquiry.phone || '—'}</span>
                    {selectedEnquiry.phone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedEnquiry.phone || '', 'Phone number')}
                        className="admin-btn-icon"
                        style={{ width: '22px', height: '22px', padding: 0 }}
                        title="Copy phone number"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="admin-label" style={{ fontSize: '11px' }}>
                  Client Message
                </label>
                <div
                  style={{
                    padding: '0.875rem',
                    background: '#FAFAF8',
                    border: '1px solid var(--admin-border-color)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: 'var(--admin-text-main)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedEnquiry.message || 'No additional message text.'}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '0.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--admin-border-color)',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleToggleReadStatus(selectedEnquiry)}
                  className="admin-btn secondary"
                  style={{ fontSize: '12px' }}
                >
                  Mark as {selectedEnquiry.isRead ? 'Unread' : 'Read'}
                </button>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEnquiry(null);
                      setReplyMenuOpen(false);
                    }}
                    className="admin-btn secondary"
                    style={{ fontSize: '12px' }}
                  >
                    Close
                  </button>

                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <a
                      href={getGmailComposeUrl({
                        to: selectedEnquiry.email,
                        ...buildEnquiryReplyDraft(selectedEnquiry),
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (!selectedEnquiry.isRead) {
                          handleToggleReadStatus(selectedEnquiry);
                        }
                        alert.success(
                          `Opening Gmail compose for ${selectedEnquiry.name}...`,
                          'Replying via Gmail'
                        );
                      }}
                      className="admin-btn primary"
                      style={{
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                        paddingRight: '10px',
                        textDecoration: 'none',
                      }}
                      title="Open in Gmail Compose"
                    >
                      <Reply size={13} /> Reply via Email
                    </a>

                    <button
                      type="button"
                      onClick={() => setReplyMenuOpen((prev) => !prev)}
                      className="admin-btn primary"
                      style={{
                        fontSize: '12px',
                        padding: '0 8px',
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        borderLeft: '1px solid rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="More reply options"
                    >
                      <ChevronDown size={13} />
                    </button>

                    {replyMenuOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 'calc(100% + 6px)',
                          right: 0,
                          background: '#ffffff',
                          border: '1px solid var(--admin-border-color)',
                          borderRadius: '8px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                          zIndex: 100,
                          minWidth: '220px',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <a
                          href={getGmailComposeUrl({
                            to: selectedEnquiry.email,
                            ...buildEnquiryReplyDraft(selectedEnquiry),
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            setReplyMenuOpen(false);
                            alert.success(
                              `Opening Gmail compose for ${selectedEnquiry.name}...`,
                              'Replying via Gmail'
                            );
                          }}
                          style={{
                            padding: '8px 10px',
                            fontSize: '12.5px',
                            color: 'var(--admin-text-main)',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <Mail size={13} color="#EA4335" />
                          <span>Compose in Gmail</span>
                        </a>

                        <a
                          href={getMailtoUrl({
                            to: selectedEnquiry.email,
                            ...buildEnquiryReplyDraft(selectedEnquiry),
                          })}
                          onClick={() => setReplyMenuOpen(false)}
                          style={{
                            padding: '8px 10px',
                            fontSize: '12.5px',
                            color: 'var(--admin-text-main)',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <Reply size={13} />
                          <span>Default Mail Client</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
