import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertToastItem {
  id: string;
  type: AlertType;
  message: string;
  title?: string;
  duration?: number;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

interface AlertContextValue {
  showAlert: (message: string, type?: AlertType, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<AlertToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    options: ConfirmDialogOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const showAlert = useCallback(
    (message: string, type: AlertType = 'info', title?: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newAlert: AlertToastItem = { id, type, message, title, duration };

      setAlerts((prev) => [...prev, newAlert]);

      if (duration > 0) {
        setTimeout(() => {
          setAlerts((prev) => prev.filter((a) => a.id !== id));
        }, duration);
      }
    },
    []
  );

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const success = useCallback(
    (message: string, title = 'Success') => showAlert(message, 'success', title),
    [showAlert]
  );

  const error = useCallback(
    (message: string, title = 'Error') => showAlert(message, 'error', title),
    [showAlert]
  );

  const warning = useCallback(
    (message: string, title = 'Warning') => showAlert(message, 'warning', title),
    [showAlert]
  );

  const info = useCallback(
    (message: string, title = 'Notice') => showAlert(message, 'info', title),
    [showAlert]
  );

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        options,
        resolve: (val: boolean) => {
          setConfirmDialog(null);
          resolve(val);
        },
      });
    });
  }, []);

  const handleConfirmClose = () => {
    if (confirmDialog) {
      confirmDialog.resolve(false);
    }
  };

  const handleConfirmAction = () => {
    if (confirmDialog) {
      confirmDialog.resolve(true);
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, success, error, warning, info, confirm }}>
      {children}

      {/* Global Toast Alerts Container */}
      <div
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '420px',
          width: 'calc(100% - 48px)',
          pointerEvents: 'none',
        }}
        aria-live="polite"
      >
        {alerts.map((item) => {
          const config = {
            success: {
              icon: <CheckCircle2 size={19} color="#2E7D32" style={{ flexShrink: 0 }} />,
              bg: '#FFFFFF',
              border: '#C8E6C9',
              accent: '#2E7D32',
              titleColor: '#1B5E20',
            },
            error: {
              icon: <XCircle size={19} color="#D32F2F" style={{ flexShrink: 0 }} />,
              bg: '#FFFFFF',
              border: '#FFCDD2',
              accent: '#D32F2F',
              titleColor: '#B71C1C',
            },
            warning: {
              icon: <AlertTriangle size={19} color="#E65100" style={{ flexShrink: 0 }} />,
              bg: '#FFFFFF',
              border: '#FFE0B2',
              accent: '#E65100',
              titleColor: '#BF360C',
            },
            info: {
              icon: <Info size={19} color="#1565C0" style={{ flexShrink: 0 }} />,
              bg: '#FFFFFF',
              border: '#BBDEFB',
              accent: '#1565C0',
              titleColor: '#0D47A1',
            },
          }[item.type];

          return (
            <div
              key={item.id}
              style={{
                pointerEvents: 'auto',
                background: config.bg,
                border: `1px solid ${config.border}`,
                borderLeft: `4px solid ${config.accent}`,
                borderRadius: '8px',
                padding: '12px 14px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                animation: 'adminAlertSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ marginTop: '1px' }}>{config.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {item.title && (
                  <div
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: config.titleColor,
                      marginBottom: '2px',
                      lineHeight: 1.3,
                    }}
                  >
                    {item.title}
                  </div>
                )}
                <div
                  style={{
                    fontSize: '13px',
                    color: '#333333',
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                  }}
                >
                  {item.message}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeAlert(item.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  color: '#888888',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'color 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#111111';
                  e.currentTarget.style.background = '#F0F0EE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#888888';
                  e.currentTarget.style.background = 'transparent';
                }}
                title="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Global Confirmation Dialog Modal */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.options.title}
          message={confirmDialog.options.message}
          confirmLabel={confirmDialog.options.confirmLabel || 'Confirm'}
          cancelLabel={confirmDialog.options.cancelLabel || 'Cancel'}
          isDanger={confirmDialog.options.isDanger !== false}
          onConfirm={handleConfirmAction}
          onClose={handleConfirmClose}
        />
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextValue => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
