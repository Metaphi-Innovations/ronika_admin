import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import RGL from 'react-grid-layout';
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

const COLS = 96;
const ROW_HEIGHT = 16;
const MARGIN: [number, number] = [8, 8];

export const ProjectMediaGridEditor: React.FC<ProjectMediaGridEditorProps> = ({ 
  items, onChange, onDelete, onReplace, onEdit, onTogglePublish, headerContent, onDeleteAll
}) => {
  const { width, ref } = useWidth();
  const [localLayouts, setLocalLayouts] = useState<any[]>([]);

  useEffect(() => {
    let hasMissingLayouts = false;
    let nextRowY = 0;
    
    // First pass: find max Y from items that ALREADY have layouts
    items.forEach(item => {
      const l = item.layouts?.lg;
      if (l && typeof l.y === 'number' && typeof l.h === 'number') {
        const yV2 = l.v === 2 ? l.y : (l.y * 2 || 0);
        const hV2 = l.v === 2 ? l.h : (l.h * 2 || 24);
        if (yV2 + hV2 > nextRowY) nextRowY = yV2 + hV2;
      }
    });

    let currentX = 0;
    const updatedItems = [...items];

    const newLayouts = items.map((item, index) => {
      const itemLayout = item.layouts?.lg;
      if (itemLayout && typeof itemLayout.w === 'number' && typeof itemLayout.h === 'number') {
        const isV2 = itemLayout.v === 2;
        return {
          i: item.id,
          x: isV2 ? itemLayout.x : (itemLayout.x * 2 || 0),
          y: isV2 ? itemLayout.y : (itemLayout.y * 2 || 0),
          w: isV2 ? itemLayout.w : (itemLayout.w * 2 || 32),
          h: isV2 ? itemLayout.h : Math.max(1, itemLayout.h * 2 || 24),
          minW: 1,
          minH: 1
        };
      }

      // Generate layout for new image
      hasMissingLayouts = true;
      const newLg = {
        x: currentX,
        y: nextRowY,
        w: 16,
        h: 16,
        v: 2
      };
      
      updatedItems[index] = {
        ...item,
        layouts: {
          ...item.layouts,
          lg: newLg
        }
      };

      currentX += 16;
      if (currentX >= 96) {
        currentX = 0;
        nextRowY += 16;
      }

      return {
        i: item.id,
        ...newLg,
        minW: 1,
        minH: 1
      };
    });

    setLocalLayouts(newLayouts);

    if (hasMissingLayouts && onChange) {
      // We wrap in setTimeout to avoid updating parent state during child render
      setTimeout(() => {
        onChange(updatedItems);
      }, 0);
    }
  }, [items]);



  const handleDragStop = (layout: any[]) => {
    if (onChange) {
      const updatedItems = items.map(item => {
        const l = layout.find(x => x.i === item.id);
        if (l) {
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
      onChange(updatedItems);
    }
  };

  const handleResizeStop = (layout: any[]) => {
    if (onChange) {
      const updatedItems = items.map(item => {
        const l = layout.find(x => x.i === item.id);
        if (l) {
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
      onChange(updatedItems);
    }
  };

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
        overflow: 'hidden',
        minHeight: '200px'
      }}>
        {width > 0 && (
        <ReactGridLayout
          className="layout"
          layout={localLayouts}
          cols={COLS}
          width={width}
          rowHeight={ROW_HEIGHT}
          margin={MARGIN}
          onDragStop={handleDragStop}
          onResizeStop={handleResizeStop}
          isDraggable={true}
          isResizable={true}
          resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
          useCSSTransforms={true}
          preventCollision={false}
          compactType="vertical"
        >
          {items.map((item) => {
            return (
              <div 
                key={item.id}
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
        )}
      </div>
    </div>
  );
};
