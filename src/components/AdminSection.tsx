import React from 'react';

export interface AdminSectionProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
}

export const AdminSection: React.FC<AdminSectionProps> = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
  noPadding = false,
  style,
  bodyStyle,
  headerStyle,
}) => {
  const hasHeader = Boolean(title || actions);

  return (
    <section className={`admin-section ${className}`} style={style}>
      {hasHeader && (
        <div className="admin-section-header" style={headerStyle}>
          <div className="admin-section-title-wrap">
            {title && (
              typeof title === 'string' ? (
                <h3 className="admin-section-title">{title}</h3>
              ) : (
                title
              )
            )}
            {subtitle && (
              typeof subtitle === 'string' ? (
                <p className="admin-section-subtitle">{subtitle}</p>
              ) : (
                subtitle
              )
            )}
          </div>
          {actions && <div className="admin-section-actions">{actions}</div>}
        </div>
      )}
      <div className={`admin-section-body ${noPadding ? 'no-padding' : ''}`} style={bodyStyle}>
        {children}
      </div>
    </section>
  );
};

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  style,
}) => {
  return (
    <header className="page-header" style={style}>
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className="page-header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </header>
  );
};

export default AdminSection;
