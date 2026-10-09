import React, { useMemo, useState, useRef, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';
import RGL from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useWidth } from '../hooks/useWidth';

const ReactGridLayout = RGL as any;

export interface ILayoutItem {
  x: number;
  y: number;
  w: number;
  h: number;
  v?: number;
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
  aspectRatio?: number;
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

const COLS = 96;
const ROW_HEIGHT = 16;
const MARGIN: [number, number] = [8, 8];

export const MediaGridEditor: React.FC<MediaGridEditorProps> = ({ items, onChange, onDelete, onReplace, onEdit, onTogglePublish, headerContent }) => {
  const { width, ref } = useWidth();
  
  const layout = useMemo(() => {
    return items.map((item, index) => {
      const bLayout = item.layouts?.lg;
      if (bLayout) {
        const isV2 = bLayout.v === 2;
        return {
          i: String(item.id),
          x: isV2 ? bLayout.x : (bLayout.x * 2 || 0),
          y: isV2 ? bLayout.y : (bLayout.y * 2 || 0),
          w: isV2 ? bLayout.w : (bLayout.w * 2 || 32),
          h: isV2 ? bLayout.h : (bLayout.h * 2 || 24),
          minW: 1,
          minH: 1
        };
      }
      return {
        i: String(item.id),
        x: (index * 16) % COLS,
        y: Math.floor((index * 16) / COLS) * 16,
        w: 16,
        h: 16,
        minW: 1,
        minH: 1
      };
    });
  }, [items]);

  const handleDragStop = (layout: any[]) => {
    let hasChanges = false;
    const updatedItems = items.map(item => {
      const l = layout.find(x => x.i === String(item.id));
      if (l) {
        const currentLg = item.layouts?.lg;
        if (!currentLg || currentLg.x !== l.x || currentLg.y !== l.y || currentLg.w !== l.w || currentLg.h !== l.h) {
          hasChanges = true;
          return {
            ...item,
            layouts: {
              ...item.layouts,
              lg: { x: l.x, y: l.y, w: l.w, h: l.h, v: 2 }
            }
          };
        }
      }
      return item;
    });
    if (hasChanges) onChange(updatedItems);
  };

  const handleResizeStop = (layout: any[]) => {
    let hasChanges = false;
    const updatedItems = items.map(item => {
      const l = layout.find(x => x.i === String(item.id));
      if (l) {
        const currentLg = item.layouts?.lg;
        if (!currentLg || currentLg.x !== l.x || currentLg.y !== l.y || currentLg.w !== l.w || currentLg.h !== l.h) {
          hasChanges = true;
          return {
            ...item,
            layouts: {
              ...item.layouts,
              lg: { x: l.x, y: l.y, w: l.w, h: l.h, v: 2 }
            }
          };
        }
      }
      return item;
    });
    if (hasChanges) onChange(updatedItems);
  };

  return (
    <div className="media-grid-editor" ref={ref}>
      {headerContent !== undefined ? headerContent : (
        <div style={{ padding: '10px', background: '#f5f5f5', marginBottom: '10px', borderRadius: '6px' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Gallery Grid Layout</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Drag to move, resize from bottom right to stretch.</p>
        </div>
      )}

      {width > 0 && (
        <ReactGridLayout
          width={width}
          className="layout"
          layout={layout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          onDragStop={handleDragStop}
          onResizeStop={handleResizeStop}
          isDraggable={true}
          isResizable={true}
          resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
          compactType="vertical"
          margin={MARGIN}
          preventCollision={false}
          useCSSTransforms={true}
        >
          {items.map((item) => {
            return (
              <div 
                key={String(item.id)} 
                className="rgl-item-container"
                style={{ border: '1px solid #ddd', background: '#fff', borderRadius: '4px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
              >
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: 'var(--admin-surface-subtle)', width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}>
                  <img 
                    src={item.url} 
                    alt="Grid item" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} 
                    draggable={false}
                  />
                  
                  {/* Shared Overlays */}
                  <div className="grid-item-overlays">
                    <div className="grid-item-header">
                      <div className="grid-item-category-wrapper">
                        {item.categoryName && (
                          <span className="grid-item-category" title={item.categoryName}>
                            {item.categoryName}
                          </span>
                        )}
                      </div>
                      
                      {/* Top Right Action Icons */}
                      <div className="grid-item-actions">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onEdit(item.id); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="grid-action-btn"
                            aria-label="Edit image"
                            title="Edit image"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="grid-action-btn"
                            aria-label="Remove image"
                            title="Remove image"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </ReactGridLayout>
      )}
    </div>
  );
};
