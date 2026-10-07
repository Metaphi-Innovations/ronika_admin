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
  MoreVertical,
  MailOpen
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
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

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

      <AdminSection noPadding style={{ overflow: 'visible' }} bodyStyle={{ overflow: 'visible' }}>
        {loading ? (
          <Loader text="Loading client messages..." minHeight="200px" />
        ) : filteredEnquiries.length === 0 ? (
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
            <MessageSquare
              size={36}
              color="var(--admin-border)"
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
          <div style={{ overflow: 'visible' }}>
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
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--admin-text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              wordBreak: 'break-all'
                            }}
                          >
                            <Mail size={12} style={{ flexShrink: 0 }} /> {enquiry.email}
                          </div>
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
                          border: '1px solid var(--admin-border)',
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
                        style={{
                          fontSize: '12.5px',
                          color: 'var(--admin-text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
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
                      <div
                        style={{
                          display: 'inline-flex',
                        }}
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
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          position: 'relative',
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === enquiry._id ? null : enquiry._id);
                          }}
                          className="admin-btn-icon"
                          title="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {openDropdownId === enquiry._id && (
                          <>
                            <div 
                              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(null);
                              }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '4px',
                                background: '#FFFFFF',
                                border: '1px solid var(--admin-border)',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                zIndex: 100,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                minWidth: '160px'
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  handleOpenView(enquiry);
                                }}
                                style={{
                                  background: 'none', border: 'none', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--admin-text-main)', textAlign: 'left', width: '100%'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9F9F9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Eye size={14} /> View Details
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  handleToggleRead(enquiry);
                                }}
                                style={{
                                  background: 'none', border: 'none', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--admin-text-main)', textAlign: 'left', width: '100%',
                                  borderTop: '1px solid var(--admin-border)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9F9F9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                {enquiry.isRead ? (
                                  <><Mail size={14} /> Mark as Unread</>
                                ) : (
                                  <><MailOpen size={14} /> Mark as Read</>
                                )}
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  setDeleteTarget(enquiry);
                                }}
                                style={{
                                  background: 'none', border: 'none', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--admin-danger)', textAlign: 'left', width: '100%',
                                  borderTop: '1px solid var(--admin-border)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </>
                        )}
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
                borderBottom: '1px solid var(--admin-border)',
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
                    <span
                      style={{ fontSize: '13px', color: 'var(--admin-text-main)' }}
                    >
                      {selectedEnquiry.email}
                    </span>
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
                    background: 'var(--admin-surface-subtle)',
                    border: '1px solid var(--admin-border)',
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
                  borderTop: '1px solid var(--admin-border)',
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
