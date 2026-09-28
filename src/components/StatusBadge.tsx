import React from 'react';
import { CheckCircle2, EyeOff, Star, Activity, MinusCircle } from 'lucide-react';

export type StatusType = 'published' | 'draft' | 'active' | 'inactive' | 'featured';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  style?: React.CSSProperties;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, style }) => {
  switch (status) {
    case 'published':
      return (
        <span className="status-badge published" style={style}>
          <CheckCircle2 size={12} style={{ marginRight: '4px' }} />
          {label || 'Published'}
        </span>
      );
    case 'draft':
      return (
        <span className="status-badge draft" style={style}>
          <EyeOff size={12} style={{ marginRight: '4px' }} />
          {label || 'Draft'}
        </span>
      );
    case 'active':
      return (
        <span className="status-badge published" style={style}>
          <Activity size={12} style={{ marginRight: '4px' }} />
          {label || 'Active'}
        </span>
      );
    case 'inactive':
      return (
        <span className="status-badge draft" style={style}>
          <MinusCircle size={12} style={{ marginRight: '4px' }} />
          {label || 'Inactive'}
        </span>
      );
    case 'featured':
      return (
        <span className="status-badge featured" style={style}>
          <Star size={12} style={{ marginRight: '4px' }} />
          {label || 'Featured'}
        </span>
      );
    default:
      return null;
  }
};
