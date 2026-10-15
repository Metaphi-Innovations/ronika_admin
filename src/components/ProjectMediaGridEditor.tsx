import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import RGL from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useWidth } from '../hooks/useWidth';

const ReactGridLayout = RGL as any;

import { ILayouts, ILayoutItem } from '../services/projectApi';

export interface ProjectGridMediaItem {
  id: string;
  url: string;
  layouts?: ILayouts;
  aspectRatio?: number;
  categoryName?: string;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  isPublished?: boolean;
}

interface ProjectMediaGridEditorProps {
  items: ProjectGridMediaItem[];
  onChange?: (items: ProjectGridMediaItem[]) => void;
  onDelete?: (id: string) => void;
  onReplace?: (id: string) => void;
  onEdit?: (id: string) => void;
  onTogglePublish?: (id: string, current: boolean) => void;
  headerContent?: React.ReactNode;
  onDeleteAll?: () => void;
}

import {
  RGL_COLS,
  RGL_MARGIN,
  DEFAULT_ITEM_W,
  DEFAULT_ITEM_H,
  normalizeLayoutItem,
  findNextAvailableSlot,
  compactLayout,
  computeCanonicalLayout,
  getAdminGridRowHeight
} from '../utils/gridLayout';

export const ProjectMediaGridEditor: React.FC<ProjectMediaGridEditorProps> = ({ 
  items, onChange, onDelete, onReplace, onEdit, onTogglePublish, headerContent, onDeleteAll
}) => {
  const { width, ref } = useWidth();
  const [dragLayout, setDragLayout] = useState<{ itemsRef: ProjectGridMediaItem[]; layout: any[] } | null>(null);

  // Maintain comfortable minimum grid canvas on mobile to prevent coordinate distortion
  const isMobileEditor = width > 0 && width < 680;
  const effectiveWidth = isMobileEditor ? 680 : width;
  const effectiveRowHeight = useMemo(() => getAdminGridRowHeight(effectiveWidth), [effectiveWidth]);

  // Synchronously compute canonical compacted layout from incoming items
  const synchronousLayout = useMemo(() => {
    return computeCanonicalLayout(items);
  }, [items]);

  // Use active drag override if it matches current items instance; otherwise use synchronousLayout
  const currentLayout = useMemo(() => {
    if (dragLayout && dragLayout.itemsRef === items) {
      return dragLayout.layout;
    }
    return synchronousLayout;
  }, [dragLayout, items, synchronousLayout]);

  // Sync canonical layout to parent when layouts differ or missing
  useEffect(() => {
    if (!onChange) return;

    let hasChanges = false;
    const updatedItems = items.map((item) => {
      const l = synchronousLayout.find((c: any) => c.i === String(item.id));
      if (!l) return item;
      const currentLg = item.layouts?.lg;
      const isDiff =
        !currentLg ||
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
            lg: { x: l.x, y: l.y, w: l.w, h: l.h, v: 2 },
          },
        };
      }
      return item;
    });

    if (hasChanges) {
      onChange(updatedItems);
    }
  }, [items, synchronousLayout, onChange]);

  const handleDragStop = (layout: any[]) => {
    setDragLayout({ itemsRef: items, layout });
    if (onChange) {
      let hasChanges = false;
      const updatedItems = items.map(item => {
        const l = layout.find(x => String(x.i) === String(item.id));
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
      if (hasChanges) {
        onChange(updatedItems);
      }
    }
  };

  const handleResizeStop = (layout: any[]) => {
    setDragLayout({ itemsRef: items, layout });
    if (onChange) {
      let hasChanges = false;
      const updatedItems = items.map(item => {
        const l = layout.find(x => String(x.i) === String(item.id));
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
      if (hasChanges) {
        onChange(updatedItems);
      }
    }
  };

  useEffect(() => {
    const handles = document.querySelectorAll('.project-media-grid-editor .react-resizable-handle-se');
    handles.forEach((h) => {
      h.setAttribute('title', 'Resize image');
      h.setAttribute('aria-label', 'Resize image');
      h.setAttribute('role', 'button');
    });
  }, [items, currentLayout]);

  return (
    <div className="project-media-grid-editor" ref={ref}>
      {headerContent !== undefined ? headerContent : (
        <div style={{ padding: '10px', background: '#f5f5f5', marginBottom: '10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Grid Layout Editor</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Drag and resize images using the grid structure.</p>
          </div>
          {onDeleteAll && items.length > 0 && (
            <button
              onClick={onDeleteAll}
              className="admin-btn secondary danger"
              style={{ padding: '4px 8px', fontSize: '12px', minWidth: 'auto', border: '1px solid #ff4444', color: '#ff4444', backgroundColor: 'transparent' }}
              type="button"
            >
              Delete All
            </button>
          )}
        </div>
      )}

      <div style={{ 
        backgroundColor: '#f9f9f9',
        border: '1px dashed #ccc',
        borderRadius: '4px',
        overflowX: isMobileEditor ? 'auto' : 'hidden',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        minHeight: '200px',
        width: '100%'
      }}>
        {isMobileEditor && (
          <div style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--admin-text-muted)', background: '#F5F5F3', borderBottom: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>↔ Swipe horizontally to arrange desktop layout comfortably</span>
          </div>
        )}
        {width > 0 && (
        <div style={{ minWidth: isMobileEditor ? '680px' : '100%' }}>
          <ReactGridLayout
            className="layout"
            layout={currentLayout}
            cols={RGL_COLS}
            width={effectiveWidth}
            rowHeight={effectiveRowHeight}
            margin={RGL_MARGIN}
            gridConfig={{ cols: RGL_COLS, rowHeight: effectiveRowHeight, margin: RGL_MARGIN }}
            onDragStop={handleDragStop}
            onResizeStop={handleResizeStop}
            isDraggable={true}
            isResizable={true}
            resizeHandles={['se']}
            useCSSTransforms={true}
            preventCollision={false}
            compactType="vertical"
          >
          {items.map((item) => {
            return (
              <div
                key={String(item.id)}
                data-grid={currentLayout.find((l: any) => l.i === String(item.id))}
                className="rgl-item-container"
                style={{
                  boxSizing: 'border-box',
                  margin: 0,
                  padding: 0,
                  border: '1px solid #ddd',
                  background: '#fff',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  width: '100%',
                  height: '100%'
                }}
              >
                <div className="drag-handle" style={{ 
                  flex: 1, 
                  position: 'relative', 
                  overflow: 'hidden', 
                  backgroundColor: 'var(--admin-surface-subtle)',
                  cursor: 'move',
                  width: '100%',
                  height: '100%',
                  minWidth: 0,
                  minHeight: 0
                }}>
                  <img 
                    src={item.url} 
                    alt="Grid item" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block', pointerEvents: 'none' }} 
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
                      
                      <div className="grid-item-actions">
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

                    {!item.isPublished && item.isPublished !== undefined && (
                      <div className="grid-item-draft-overlay">
                        <span className="grid-item-draft-badge">DRAFT</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </ReactGridLayout>
        </div>
        )}
      </div>
    </div>
  );
};
