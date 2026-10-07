import React, { useState, useEffect, useCallback } from 'react';
import RGL from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useWidth } from '../hooks/useWidth';
import { useDesignState } from '../hooks/useDesignState';

const ReactGridLayout = RGL as any;

export interface ILayoutItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ILayouts {
  lg?: ILayoutItem;
  md?: ILayoutItem;
  sm?: ILayoutItem;
  xs?: ILayoutItem;
}

export interface GridMediaItem {
  id: string; // The _id from IImage or IGalleryImage
  url: string;
  layouts?: ILayouts;
  title?: string;
  categoryName?: string;
  published?: boolean;
}

interface MediaGridEditorProps {
  items: GridMediaItem[];
  onChange: (items: GridMediaItem[]) => void;
  onDelete?: (id: string) => void;
  onReplace?: (id: string) => void;
  onEdit?: (id: string) => void;
  onTogglePublish?: (id: string) => void;
  headerContent?: React.ReactNode;
}

// Convert our custom layouts format to RGL's expected layouts format
const mapItemsToRGL = (items: GridMediaItem[]) => {
  const rglLayouts: any = { lg: [], md: [], sm: [], xs: [] };
  
  items.forEach((item, index) => {
    ['lg', 'md', 'sm', 'xs'].forEach((bp) => {
      const bLayout = item.layouts?.[bp as keyof ILayouts];
      if (bLayout) {
        rglLayouts[bp].push({
          i: item.id,
          x: bLayout.x,
          y: bLayout.y,
          w: bLayout.w,
          h: bLayout.h,
        });
      } else {
        // Migration / Default layout fallback
        rglLayouts[bp].push({
          i: item.id,
          x: (index * 2) % 12,
          y: Math.floor((index * 2) / 12) * 2,
          w: 2,
          h: 2,
        });
      }
    });
  });
  
  return rglLayouts;
};

export const MediaGridEditor: React.FC<MediaGridEditorProps> = ({ items, onChange, onDelete, onReplace, onEdit, onTogglePublish, headerContent }) => {
  const [layouts, setLayouts] = useState<any>(mapItemsToRGL(items));
  const { width, ref } = useWidth();
  const { breakpoint, cols } = useDesignState();

  useEffect(() => {
    setLayouts(mapItemsToRGL(items));
  }, [items]);

  const handleLayoutChange = (currentLayout: any) => {
    const newLayouts = { ...layouts, [breakpoint]: currentLayout };
    setLayouts(newLayouts);
    
    // Map back to our objects
    const updatedItems = items.map((item) => {
      const newItem = { ...item, layouts: { ...item.layouts } };
      
      const lay = currentLayout.find((l: any) => l.i === item.id);
      if (lay) {
        newItem.layouts![breakpoint as keyof ILayouts] = {
          x: lay.x,
          y: lay.y,
          w: lay.w,
          h: lay.h,
        };
      }
      return newItem;
    });
    
    onChange(updatedItems);
  };

  return (
    <div className="media-grid-editor" ref={ref}>
      {headerContent !== undefined ? headerContent : (
        <div style={{ padding: '10px', background: '#f5f5f5', marginBottom: '10px', borderRadius: '6px' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Active Design State: {breakpoint.toUpperCase()}</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Drag to move, resize from bottom right to stretch.</p>
        </div>
      )}

      {width > 0 && (
        <ReactGridLayout
          width={width}
          className="layout"
          layout={layouts[breakpoint]}
          cols={cols}
          rowHeight={100}
          onLayoutChange={handleLayoutChange}
          isDraggable={true}
          isResizable={true}
          compactType="vertical"
          margin={[16, 16]}
        >
          {items.map((item) => (
            <div key={item.id} style={{ border: '1px solid #ddd', background: '#fff', borderRadius: '4px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: 'var(--admin-surface-subtle)' }}>
                <img 
                  src={item.url} 
                  alt="Grid item" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  draggable={false}
                />
                {item.categoryName && (
                  <span style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: 'rgba(0,0,0,0.75)', color: '#FFFFFF', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '3px', textTransform: 'uppercase' }}>
                    {item.categoryName}
                  </span>
                )}
                <div style={{ position: 'absolute', top: 5, right: 5, display: 'flex', gap: '4px' }}>
                  {onReplace && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onReplace(item.id); }}
                      style={{ background: 'white', border: '1px solid var(--admin-border-input)', borderRadius: '4px', cursor: 'pointer', padding: '0 6px', height: '26px', fontSize: '10px', fontWeight: 600 }}
                      title="Replace Image"
                    >
                      Swap
                    </button>
                  )}
                  {onDelete && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                      style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0 6px', height: '26px', fontSize: '10px', fontWeight: 600 }}
                      title="Delete Image"
                    >
                      Del
                    </button>
                  )}
                </div>
              </div>

              {(item.title !== undefined || onEdit || onTogglePublish) && (
                <div style={{ padding: '8px 10px', backgroundColor: '#FFFFFF', borderTop: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, marginRight: '8px' }}>
                    {item.title || 'Untitled'}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {onTogglePublish && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onTogglePublish(item.id); }}
                        style={{
                          background: item.published ? '#E8F5E9' : '#FFF3E0',
                          color: item.published ? '#2E7D32' : '#E65100',
                          border: `1px solid ${item.published ? '#81C784' : '#FFA726'}`,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          padding: '0 6px',
                          height: '22px',
                          fontSize: '9px',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}
                      >
                        {item.published ? 'Pub' : 'Draft'}
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(item.id); }}
                        style={{ background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', padding: '0 6px', height: '22px', fontSize: '9px', fontWeight: 600 }}
                        title="Edit Info"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  );
};
