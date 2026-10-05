import React from 'react';

interface LoaderProps {
  text?: string;
  minHeight?: string;
}

export const Loader: React.FC<LoaderProps> = ({ 
  text = 'Loading...',
  minHeight = '60vh'
}) => {
  return (
    <div style={{ 
      minHeight, 
      padding: '4rem 1rem', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      gap: '12px' 
    }}>
      <div className="spinner" style={{ width: '28px', height: '28px' }}></div>
      <span style={{ 
        fontSize: '11px', 
        fontWeight: 600, 
        letterSpacing: '0.08em', 
        textTransform: 'uppercase', 
        color: 'var(--admin-text-muted, #777)' 
      }}>
        {text}
      </span>
    </div>
  );
};
