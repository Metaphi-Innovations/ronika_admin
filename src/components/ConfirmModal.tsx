import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDanger = true,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', width: '90%' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isDanger && (
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#FFEBEE',
                  color: 'var(--admin-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={18} />
              </div>
            )}
            <h3 id="confirm-modal-title" className="modal-title" style={{ margin: 0, fontSize: '16px' }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="modal-close-btn"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem 1.5rem', fontSize: '14px', color: 'var(--admin-text-muted)', lineHeight: '1.5' }}>
          {message}
        </div>

        <div className="modal-footer" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--admin-border-color)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="admin-btn secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`admin-btn ${isDanger ? 'danger' : 'primary'}`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
