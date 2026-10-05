import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  Trash2,
  CheckCircle,
  Eye,
  Reply,
  ShoppingBag,
  Clock,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  getEnquiries,
  toggleEnquiryRead,
  deleteEnquiry,
  IEnquiry,
} from '../services/enquiryApi';
import { PageHeader, AdminSection } from '../components/AdminSection';
import { Loader } from '../components/Loader';
import { ConfirmModal } from '../components/ConfirmModal';
import { useAlert } from '../context/AlertContext';
import {
  getGmailComposeUrl,
  getMailtoUrl,
  buildEnquiryReplyDraft,
} from '../utils/mail';
import { useLiveResource } from '../context/LiveSyncContext';

export const MessagesPage: React.FC = () => {
  const alert = useAlert();
  const [enquiries, setEnquiries] = useState<IEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedEnquiry, setSelectedEnquiry] = useState<IEnquiry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IEnquiry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [replyMenuOpen, setReplyMenuOpen] = useState(false);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert.success(`${label} copied to clipboard!`, 'Copied');
    } catch {
      alert.error('Failed to copy to clipboard', 'Error');
    }
  };

  const fetchEnquiries = async (isInitial = true) => {
    try {
      if (isInitial) setLoading(true);
      const res = await getEnquiries();
      if (res.success) {
        setEnquiries(res.data);
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to load client messages', 'Error');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries(true);
  }, []);

  useLiveResource('enquiries', () => {
    fetchEnquiries(false);
  });

  const handleToggleRead = async (enquiry: IEnquiry) => {
    try {
      const nextState = !enquiry.isRead;
      const res = await toggleEnquiryRead(enquiry._id, nextState);
      if (res.success) {
        setEnquiries((prev) =>
          prev.map((e) => (e._id === enquiry._id ? { ...e, isRead: nextState } : e))
        );
        if (selectedEnquiry && selectedEnquiry._id === enquiry._id) {
          setSelectedEnquiry({ ...selectedEnquiry, isRead: nextState });
        }
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to update message status', 'Error');
    }
  };

  const handleOpenView = async (enquiry: IEnquiry) => {
    setSelectedEnquiry(enquiry);
    if (!enquiry.isRead) {
      // Automatically mark as read on view
      handleToggleRead(enquiry);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteEnquiry(deleteTarget._id);
      setEnquiries((prev) => prev.filter((e) => e._id !== deleteTarget._id));
      alert.success(`Enquiry from ${deleteTarget.name} deleted.`, 'Deleted');
      if (selectedEnquiry?._id === deleteTarget._id) {
        setSelectedEnquiry(null);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      alert.error(err.message || 'Failed to delete enquiry', 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredEnquiries = useMemo(() => {
    if (filter === 'unread') return enquiries.filter((e) => !e.isRead);
    if (filter === 'read') return enquiries.filter((e) => e.isRead);
    return enquiries;
  }, [enquiries, filter]);

  const unreadCount = useMemo(() => enquiries.filter((e) => !e.isRead).length, [enquiries]);

  return (
    <div>
      <PageHeader
        title="CLIENT MESSAGES"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setFilter('all')}
              className={`admin-btn ${filter === 'all' ? 'primary' : 'secondary'}`}
              style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '16px' }}
            >
              All ({enquiries.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`admin-btn ${filter === 'unread' ? 'primary' : 'secondary'}`}
              style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '16px' }}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`admin-btn ${filter === 'read' ? 'primary' : 'secondary'}`}
              style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '16px' }}
            >
              Read ({enquiries.length - unreadCount})
            </button>
          </div>
        }
      />

      <AdminSection noPadding>
        {loading ? (
          <Loader text="Loading client messages..." minHeight="200px" />
        ) : filteredEnquiries.length === 0 ? (
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
            <MessageSquare
              size={36}
              color="var(--admin-border-color)"
              style={{ marginBottom: '0.75rem' }}
            />
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--admin-text-main)',
                marginBottom: '0.25rem',
              }}
            >
              {filter === 'unread'
                ? 'No unread messages'
                : filter === 'read'
                ? 'No read messages'
                : 'No client messages yet'}
            </h3>
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', margin: 0 }}>
              {filter === 'all'
                ? 'When clients enquire through the "Shop Now" button, their messages will appear here.'
                : 'Switch filters to see all messages.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-data-grid">
              <thead>
                <tr>
                  <th style={{ width: '55px' }}>S.No.</th>
                  <th>Client</th>
                  <th>Product Enquired</th>
                  <th>Message Preview</th>
                  <th>Received Date</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnquiries.map((enquiry, index) => (
                  <tr
                    key={enquiry._id}
                    style={{
                      backgroundColor: enquiry.isRead ? 'transparent' : 'rgba(230, 81, 0, 0.03)',
                    }}
                  >
                    <td>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--admin-text-muted)',
                        }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div
                          style={{
                            fontWeight: enquiry.isRead ? 500 : 700,
                            fontSize: '13.5px',
                            color: 'var(--admin-text-main)',
                          }}
                        >
                          {enquiry.name}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                          <a
                            href={getGmailComposeUrl({
                              to: enquiry.email,
                              ...buildEnquiryReplyDraft(enquiry),
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '12px',
                              color: 'var(--admin-text-muted)',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              wordBreak: 'break-all'
                            }}
                            title="Click to compose reply in Gmail"
                          >
                            <Mail size={12} style={{ flexShrink: 0 }} /> {enquiry.email}
                          </a>
                          {enquiry.phone && (
                            <span
                              style={{
                                fontSize: '12px',
                                color: 'var(--admin-text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                wordBreak: 'break-all'
                              }}
                            >
                              <Phone size={12} style={{ flexShrink: 0 }} /> {enquiry.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#F5F5F3',
                          border: '1px solid var(--admin-border-color)',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'var(--admin-text-main)',
                        }}
                      >
                        <ShoppingBag size={12} />
                        <span>{enquiry.productName}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <div
                        onClick={() => handleOpenView(enquiry)}
                        style={{
                          fontSize: '12.5px',
                          color: 'var(--admin-text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer',
                        }}
                        title="Click to view full message"
                      >
                        {enquiry.message || '(No written message provided)'}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--admin-text-muted)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {new Date(enquiry.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleToggleRead(enquiry)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'inline-flex',
                        }}
                        title={enquiry.isRead ? 'Click to mark as unread' : 'Click to mark as read'}
                      >
                        {enquiry.isRead ? (
                          <span
                            style={{
                              fontSize: '11px',
                              background: '#E8F5E9',
                              color: '#2E7D32',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Check size={11} /> READ
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '11px',
                              background: '#FFF3E0',
                              color: '#E65100',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span style={{ fontSize: '8px', lineHeight: 1 }}>●</span> UNREAD
                          </span>
                        )}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.4rem',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <button
                          onClick={() => handleOpenView(enquiry)}
                          className="admin-btn-icon"
                          title="View Message Details"
                        >
                          <Eye size={15} />
                        </button>
                        <a
                          href={getGmailComposeUrl({
                            to: enquiry.email,
                            ...buildEnquiryReplyDraft(enquiry),
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-btn-icon"
                          title="Reply via Gmail"
                          onClick={() => {
                            if (!enquiry.isRead) {
                              handleToggleRead(enquiry);
                            }
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Reply size={15} />
                        </a>
                        <button
                          onClick={() => setDeleteTarget(enquiry)}
                          className="admin-btn-icon danger"
                          title="Delete Enquiry"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      {/* View Message Modal */}
      {selectedEnquiry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="admin-card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(94vw, 520px)', padding: '1.25rem', maxHeight: '90dvh', overflowY: 'auto' }}
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
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>CLIENT ENQUIRY</h3>
              <button
                onClick={() => setSelectedEnquiry(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'var(--admin-text-muted)',
                }}
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
                  <ShoppingBag size={15} /> {selectedEnquiry.productName}
                </div>
              </div>

              <div className="admin-two-col-grid" style={{ gap: '0.875rem' }}>
                <div>
                  <label className="admin-label" style={{ fontSize: '11px' }}>
                    Client Name
                  </label>
                  <div style={{ fontSize: '13.5px', color: 'var(--admin-text-main)' }}>
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
                  <div style={{ fontSize: '13px', color: 'var(--admin-text-main)' }}>
                    {selectedEnquiry.phone || '—'}
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
                    wordBreak: 'break-all',
                    overflowWrap: 'break-word',
                  }}
                >
                  {selectedEnquiry.message || 'No additional message text.'}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  marginTop: '0.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--admin-border-color)',
                }}
              >
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

                  <a
                    href={getGmailComposeUrl({
                      to: selectedEnquiry.email,
                      ...buildEnquiryReplyDraft(selectedEnquiry),
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (!selectedEnquiry.isRead) {
                        handleToggleRead(selectedEnquiry);
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
                      textDecoration: 'none',
                    }}
                    title="Open in Gmail (Web)"
                  >
                    <ExternalLink size={13} /> Open in Gmail (Web)
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Enquiry?"
        message={`Are you sure you want to delete this enquiry from "${deleteTarget?.name}"?`}
        confirmLabel="Delete Enquiry"
        isLoading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
