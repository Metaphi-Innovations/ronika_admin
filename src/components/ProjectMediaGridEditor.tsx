import React, { useState, useEffect } from 'react';
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
}

const COLS = 48;
const ROW_HEIGHT = 40;
const MARGIN: [number, number] = [8, 8];

export const ProjectMediaGridEditor: React.FC<ProjectMediaGridEditorProps> = ({ 
  items, onChange, onDelete, onReplace, onEdit, onTogglePublish, headerContent
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
        if (l.y + l.h > nextRowY) nextRowY = l.y + l.h;
      }
    });

    let currentX = 0;
    const updatedItems = [...items];

    const newLayouts = items.map((item, index) => {
      const itemLayout = item.layouts?.lg;
      if (itemLayout && typeof itemLayout.w === 'number' && typeof itemLayout.h === 'number') {
        return {
          i: item.id,
          x: isNaN(itemLayout.x) ? 0 : itemLayout.x,
          y: isNaN(itemLayout.y) ? 0 : itemLayout.y,
          w: itemLayout.w,
          h: itemLayout.h,
          minW: 2,
          minH: 2
        };
      }

      // Generate layout for new image
      hasMissingLayouts = true;
      const newLg = {
        x: currentX,
        y: nextRowY,
        w: 16,
        h: 12
      };
      
      updatedItems[index] = {
        ...item,
        layouts: {
          ...item.layouts,
          lg: newLg
        }
      };

      currentX += 16;
      if (currentX >= 48) {
        currentX = 0;
        nextRowY += 12;
      }

      return {
        i: item.id,
        ...newLg,
        minW: 2,
        minH: 2
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

  const handleLayoutChange = (newLayout: any[]) => {
    setLocalLayouts(newLayout);
  };

  const handleDragStop = (layout: any[]) => {
    if (onChange) {
      const updatedItems = items.map(item => {
        const l = layout.find(x => x.i === item.id);
        if (l) {
          return {
            ...item,
            layouts: {
              ...item.layouts,
              lg: { x: l.x, y: l.y, w: l.w, h: l.h }
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
              lg: { x: l.x, y: l.y, w: l.w, h: l.h }
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
        <div style={{ padding: '10px', background: '#f5f5f5', marginBottom: '10px', borderRadius: '6px' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Grid Layout Editor</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Drag and resize images using the grid structure.</p>
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
          onLayoutChange={handleLayoutChange}
          onDragStop={handleDragStop}
          onResizeStop={handleResizeStop}
          isDraggable={true}
          isResizable={true}
          useCSSTransforms={true}
          preventCollision={true}
          compactType={null}
        >
          {items.map((item) => {
            return (
              <div 
                key={item.id}
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
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div className="drag-handle" style={{ 
                  flex: 1, 
                  position: 'relative', 
                  overflow: 'hidden', 
                  backgroundColor: 'var(--admin-surface-subtle)',
                  cursor: 'move'
                }}>
                  <img 
                    src={item.url} 
                    alt="Grid item" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block', pointerEvents: 'none' }} 
                    draggable={false}
                  />
                  {item.categoryName && (
                    <span style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: 'rgba(0,0,0,0.75)', color: '#FFFFFF', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '3px', textTransform: 'uppercase' }}>
                      {item.categoryName}
                    </span>
                  )}
                  {!item.isPublished && item.isPublished !== undefined && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <span style={{ backgroundColor: '#000', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>DRAFT</span>
                    </div>
                  )}
                </div>
                <div style={{ padding: '6px', display: 'flex', gap: '6px', justifyContent: 'center', background: '#fafafa', borderTop: '1px solid #eee' }} className="grid-item-actions">
                  {onEdit && (
                    <button type="button" onClick={() => onEdit(item.id)} style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', background: '#fff' }}>Edit</button>
                  )}

                  {onDelete && (
                    <button type="button" onClick={() => onDelete(item.id)} style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ffcdd2', color: '#d32f2f', background: '#fff' }}>Delete</button>
                  )}
                  {onTogglePublish && (
                    <button type="button" onClick={() => onTogglePublish(item.id, !!item.isPublished)} style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', background: item.isPublished ? '#e8f5e9' : '#f5f5f5', color: item.isPublished ? '#2e7d32' : '#666' }}>
                      {item.isPublished ? 'Published' : 'Draft'}
                    </button>
                  )}
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
