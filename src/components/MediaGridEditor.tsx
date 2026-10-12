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

import {
  RGL_COLS,
  RGL_ROW_HEIGHT,
  RGL_MARGIN,
  DEFAULT_ITEM_W,
  DEFAULT_ITEM_H,
  normalizeLayoutItem,
  findNextAvailableSlot,
  compactLayout
} from '../utils/gridLayout';

export const MediaGridEditor: React.FC<MediaGridEditorProps> = ({ items, onChange, onDelete, onReplace, onEdit, onTogglePublish, headerContent }) => {
  const { width, ref } = useWidth();
  const [localLayouts, setLocalLayouts] = useState<any[]>([]);
  
  useEffect(() => {
    // 1. Collect all valid normalized rectangles
    const existingRects: { x: number; y: number; w: number; h: number }[] = [];
    const initialElements: any[] = [];

    items.forEach((item) => {
      const norm = normalizeLayoutItem(item.layouts?.lg);
      const itemId = String(item.id);

      if (norm) {
        existingRects.push(norm);
        initialElements.push({
          i: itemId,
          x: norm.x,
          y: norm.y,
          w: norm.w,
          h: norm.h,
          minW: 1,
          minH: 1
        });
      } else {
        const slot = findNextAvailableSlot(existingRects, DEFAULT_ITEM_W, DEFAULT_ITEM_H, RGL_COLS);
        const newLayout = {
          x: slot.x,
          y: slot.y,
          w: DEFAULT_ITEM_W,
          h: DEFAULT_ITEM_H
        };
        existingRects.push(newLayout);
        initialElements.push({
          i: itemId,
          ...newLayout,
          minW: 1,
          minH: 1
        });
      }
    });

    // 2. Compact vertically to match canonical RGL vertical compaction
    const compacted = compactLayout(initialElements, RGL_COLS);
    setLocalLayouts(compacted);

    // 3. If any item's layout in props was missing or different from compacted, sync parent
    let hasChanges = false;
    const updatedItems = items.map(item => {
      const l = compacted.find(c => c.i === String(item.id));
      if (!l) return item;
      const currentLg = item.layouts?.lg;
      const isDiff = !currentLg || 
        currentLg.x !== l.x || 
        currentLg.y !== l.y || 
        currentLg.w !== l.w || 
        currentLg.h !== l.h;
      if (isDiff) {
        hasChanges = true;
        return {
          ...item,
          layouts: {
            ...item.layouts,
            lg: { x: l.x, y: l.y, w: l.w, h: l.h, v: 2 }
          }
        };
      }
      return item;
    });

    if (hasChanges && onChange) {
      onChange(updatedItems);
    }
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
          layout={localLayouts}
          cols={RGL_COLS}
          rowHeight={RGL_ROW_HEIGHT}
          margin={RGL_MARGIN}
          gridConfig={{ cols: RGL_COLS, rowHeight: RGL_ROW_HEIGHT, margin: RGL_MARGIN }}
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
                data-grid={localLayouts.find(l => l.i === String(item.id))}
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
