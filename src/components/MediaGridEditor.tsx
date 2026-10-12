import React, { useMemo, useState, useRef, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';
import RGL from 'react-grid-layout/legacy';
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

const COLS = 12;
const ROW_HEIGHT = 150;
const MARGIN: [number, number] = [10, 10];
const DEFAULT_THUMBNAIL_W = 2;
const DEFAULT_THUMBNAIL_H = 1;

export const MediaGridEditor: React.FC<MediaGridEditorProps> = ({ items, onChange, onDelete, onReplace, onEdit, onTogglePublish, headerContent }) => {
  const { width, ref } = useWidth();
  
  const layout = useMemo(() => {
    let nextRowY = 0;
    items.forEach(item => {
      const l = item.layouts?.lg;
      if (l && typeof l.y === 'number' && typeof l.h === 'number') {
        const isLegacy96 = l.w > COLS || l.h > 8;
        const h = isLegacy96 ? Math.max(1, Math.round(l.h / 16)) : l.h;
        const y = isLegacy96 ? Math.round((l.y || 0) / 16) : l.y;
        const bottom = (y || 0) + (h || 1);
        if (bottom > nextRowY) nextRowY = bottom;
      }
    });

    let currentX = 0;
    let currentY = nextRowY;

    return items.map((item) => {
      const bLayout = item.layouts?.lg;
      if (bLayout && typeof bLayout.w === 'number' && typeof bLayout.h === 'number') {
        const isLegacy96 = bLayout.w > COLS || bLayout.h > 8;
        const safeW = isLegacy96 ? Math.max(1, Math.min(COLS, Math.round(bLayout.w / 8))) : Math.min(COLS, Math.max(1, bLayout.w));
        const safeH = isLegacy96 ? Math.max(1, Math.round(bLayout.h / 16)) : Math.min(20, Math.max(1, bLayout.h));
        const safeX = isLegacy96 ? Math.round((bLayout.x || 0) / 8) % COLS : Math.max(0, bLayout.x || 0);
        const safeY = isLegacy96 ? Math.round((bLayout.y || 0) / 16) : Math.max(0, bLayout.y || 0);
        return {
          i: String(item.id),
          x: safeX,
          y: safeY,
          w: safeW,
          h: safeH,
          minW: 1,
          minH: 1
        };
      }

      const itemX = currentX;
      const itemY = currentY;

      currentX += DEFAULT_THUMBNAIL_W;
      if (currentX + DEFAULT_THUMBNAIL_W > COLS) {
        currentX = 0;
        currentY += DEFAULT_THUMBNAIL_H;
      }

      return {
        i: String(item.id),
        x: itemX,
        y: itemY,
        w: DEFAULT_THUMBNAIL_W,
        h: DEFAULT_THUMBNAIL_H,
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
          margin={MARGIN}
          gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT, margin: MARGIN }}
          onDragStop={handleDragStop}
          onResizeStop={handleResizeStop}
          isDraggable={true}
          isResizable={true}
          resizeHandles={['se']}
          compactType="vertical"
          preventCollision={false}
          useCSSTransforms={true}
        >
          {items.map((item) => {
            return (
              <div 
                key={String(item.id)} 
                data-grid={layout.find(l => l.i === String(item.id))}
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
